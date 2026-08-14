package com.workload.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workload.dto.ApiError;
import com.workload.dto.ApiResponse;
import com.workload.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      JwtAuthenticationFilter jwtAuthenticationFilter,
      RateLimitFilter rateLimitFilter,
      AuthenticationEntryPoint authenticationEntryPoint,
      AccessDeniedHandler accessDeniedHandler)
      throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(authenticationEntryPoint)
                    .accessDeniedHandler(accessDeniedHandler))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/api/v1/auth/login",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/logout",
                        "/actuator/health")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  AuthenticationEntryPoint authenticationEntryPoint(ObjectMapper objectMapper) {
    return (request, response, authException) -> {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      ApiResponse<Void> body =
          ApiResponse.error(
              ApiError.of(HttpStatus.UNAUTHORIZED, "Invalid or expired authentication token"));
      objectMapper.writeValue(response.getOutputStream(), body);
    };
  }

  /**
   * A 403 raised inside the filter chain never reaches {@code @RestControllerAdvice} — it is
   * handled before the DispatcherServlet runs. Without this the response would skip the ApiResponse
   * envelope. The message matches {@code GlobalExceptionHandler.handleAccessDenied} so filter-level
   * and method-level denials are indistinguishable to the client.
   */
  @Bean
  AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
    return (request, response, ex) -> {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      ApiResponse<Void> body =
          ApiResponse.error(
              ApiError.of(
                  HttpStatus.FORBIDDEN, "You don't have permission to access this resource"));
      objectMapper.writeValue(response.getOutputStream(), body);
    };
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
