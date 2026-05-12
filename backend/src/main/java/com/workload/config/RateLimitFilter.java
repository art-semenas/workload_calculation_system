package com.workload.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workload.dto.ApiError;
import com.workload.dto.ApiResponse;
import com.workload.security.JwtTokenProvider;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private static final String BEARER_PREFIX = "Bearer ";
  private static final int MAX_BUCKETS = 10_000;

  private final Bandwidth unauthenticatedBandwidth;
  private final Bandwidth authenticatedBandwidth;
  private final ObjectMapper objectMapper;
  private final JwtTokenProvider jwtTokenProvider;
  private final Map<String, Bucket> buckets =
      Collections.synchronizedMap(
          new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
              return size() > MAX_BUCKETS;
            }
          });

  public RateLimitFilter(
      @Qualifier("unauthenticatedRateLimitBandwidth") Bandwidth unauthenticatedBandwidth,
      @Qualifier("authenticatedRateLimitBandwidth") Bandwidth authenticatedBandwidth,
      ObjectMapper objectMapper,
      JwtTokenProvider jwtTokenProvider) {
    this.unauthenticatedBandwidth = unauthenticatedBandwidth;
    this.authenticatedBandwidth = authenticatedBandwidth;
    this.objectMapper = objectMapper;
    this.jwtTokenProvider = jwtTokenProvider;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String uri = request.getRequestURI();
    if (!uri.startsWith("/api/v1/")) {
      filterChain.doFilter(request, response);
      return;
    }

    RateLimitTarget target = resolveTarget(request);
    Bucket bucket = getOrCreateBucket(target.key(), target.authenticated());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      long nanosToWait = bucket.estimateAbilityToConsume(1).getNanosToWaitForRefill();
      long retryAfterSeconds = Math.max(1L, (nanosToWait + 999_999_999L) / 1_000_000_000L);
      response.setStatus(429);
      response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      ApiResponse<Void> body =
          ApiResponse.error(
                  ApiError.of(
                      HttpStatus.TOO_MANY_REQUESTS,
                      "Too many requests. Please wait before retrying."));
      objectMapper.writeValue(response.getOutputStream(), body);
    }
  }

  private RateLimitTarget resolveTarget(HttpServletRequest request) {
    String authorization = request.getHeader("Authorization");
    if (jwtTokenProvider != null
        && authorization != null
        && authorization.startsWith(BEARER_PREFIX)) {
      String token = authorization.substring(BEARER_PREFIX.length());
      if (jwtTokenProvider.isValidToken(token)) {
        return new RateLimitTarget("user:" + jwtTokenProvider.getSubject(token), true);
      }
    }
    return new RateLimitTarget("ip:" + request.getRemoteAddr(), false);
  }

  private Bucket getOrCreateBucket(String key, boolean authenticated) {
    synchronized (buckets) {
      return buckets.computeIfAbsent(
          key,
          unused ->
              Bucket.builder()
                  .addLimit(authenticated ? authenticatedBandwidth : unauthenticatedBandwidth)
                  .build());
    }
  }

  private record RateLimitTarget(String key, boolean authenticated) {}
}
