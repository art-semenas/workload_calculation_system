package com.workload.dto;

/**
 * Both tokens issued by a login or refresh, plus the authenticated user.
 *
 * <p>Service-layer result only. The controller puts {@code accessToken} in the response body and
 * {@code refreshToken} in an HTTP-only cookie, so the refresh token never reaches JavaScript.
 */
public record AuthTokens(String accessToken, String refreshToken, UserDto user) {}
