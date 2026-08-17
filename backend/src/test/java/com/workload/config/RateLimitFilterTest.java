package com.workload.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.security.JwtTokenProvider;
import io.github.bucket4j.Bandwidth;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

  private static final String SECRET = "test-secret-key-minimum-32-characters-long-for-hmac";

  private RateLimitFilter filter;
  private final ObjectMapper objectMapper = new ObjectMapper();
  private JwtTokenProvider jwtTokenProvider;

  @BeforeEach
  void setUp() {
    Bandwidth unauthenticatedBandwidth =
        Bandwidth.builder().capacity(5).refillGreedy(5, Duration.ofMinutes(1)).build();
    Bandwidth authenticatedBandwidth =
        Bandwidth.builder().capacity(2).refillGreedy(2, Duration.ofMinutes(1)).build();
    jwtTokenProvider = new JwtTokenProvider(SECRET, 86400000, 604800000);
    filter =
        new RateLimitFilter(
            unauthenticatedBandwidth, authenticatedBandwidth, objectMapper, jwtTokenProvider);
  }

  @Test
  void requestsWithinLimitAreAllowed() throws Exception {
    HttpServletRequest request = mock(HttpServletRequest.class);
    org.mockito.Mockito.when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    org.mockito.Mockito.when(request.getRequestURI()).thenReturn("/api/v1/divisions");
    FilterChain chain = mock(FilterChain.class);
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilterInternal(request, response, chain);

    assertThat(response.getStatus()).isEqualTo(200);
  }

  @Test
  void requestBeyondLimitReturns429() throws Exception {
    HttpServletRequest request = mock(HttpServletRequest.class);
    org.mockito.Mockito.when(request.getRemoteAddr()).thenReturn("10.0.0.1");
    org.mockito.Mockito.when(request.getRequestURI()).thenReturn("/api/v1/divisions");
    org.mockito.Mockito.when(request.getHeader("Authorization")).thenReturn(null);
    FilterChain chain = mock(FilterChain.class);

    for (int i = 0; i < 5; i++) {
      MockHttpServletResponse resp = new MockHttpServletResponse();
      filter.doFilterInternal(request, resp, chain);
      assertThat(resp.getStatus()).isEqualTo(200);
    }

    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilterInternal(request, response, chain);

    assertThat(response.getStatus()).isEqualTo(429);
    assertThat(response.getHeader("Retry-After")).isNotBlank();
    assertThat(response.getContentAsString()).contains("\"code\":429");
  }

  @Test
  void authenticatedRequestsAreLimitedPerUserIdInsteadOfPerIp() throws Exception {
    FilterChain chain = mock(FilterChain.class);
    String token =
        jwtTokenProvider.generateToken(
            User.builder().id(UUID.randomUUID()).email("user@test.com").role(Role.EDITOR).build());

    HttpServletRequest firstRequest = mock(HttpServletRequest.class);
    org.mockito.Mockito.when(firstRequest.getRemoteAddr()).thenReturn("10.0.0.10");
    org.mockito.Mockito.when(firstRequest.getRequestURI()).thenReturn("/api/v1/divisions");
    org.mockito.Mockito.when(firstRequest.getHeader("Authorization")).thenReturn("Bearer " + token);

    HttpServletRequest secondRequest = mock(HttpServletRequest.class);
    org.mockito.Mockito.when(secondRequest.getRemoteAddr()).thenReturn("10.0.0.11");
    org.mockito.Mockito.when(secondRequest.getRequestURI()).thenReturn("/api/v1/divisions");
    org.mockito.Mockito.when(secondRequest.getHeader("Authorization"))
        .thenReturn("Bearer " + token);

    MockHttpServletResponse firstResponse = new MockHttpServletResponse();
    filter.doFilterInternal(firstRequest, firstResponse, chain);
    assertThat(firstResponse.getStatus()).isEqualTo(200);

    MockHttpServletResponse secondResponse = new MockHttpServletResponse();
    filter.doFilterInternal(secondRequest, secondResponse, chain);
    assertThat(secondResponse.getStatus()).isEqualTo(200);

    MockHttpServletResponse thirdResponse = new MockHttpServletResponse();
    filter.doFilterInternal(secondRequest, thirdResponse, chain);
    assertThat(thirdResponse.getStatus()).isEqualTo(429);
  }

  @Test
  void nonApiPathIsNotRateLimited() throws Exception {
    HttpServletRequest request = mock(HttpServletRequest.class);
    org.mockito.Mockito.when(request.getRemoteAddr()).thenReturn("10.0.0.2");
    org.mockito.Mockito.when(request.getRequestURI()).thenReturn("/actuator/health");
    org.mockito.Mockito.when(request.getHeader("Authorization")).thenReturn(null);
    FilterChain chain = mock(FilterChain.class);

    for (int i = 0; i < 10; i++) {
      MockHttpServletResponse resp = new MockHttpServletResponse();
      filter.doFilterInternal(request, resp, chain);
      assertThat(resp.getStatus()).isEqualTo(200);
    }
  }
}
