package com.workload.security;

import com.workload.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

  /**
   * Distinguishes the two token kinds. Without it a long-lived refresh token would authenticate
   * ordinary requests, which would defeat the short access-token lifetime entirely (TOR §21.2).
   */
  private static final String CLAIM_TOKEN_TYPE = "token_type";

  private static final String TYPE_ACCESS = "access";
  private static final String TYPE_REFRESH = "refresh";

  private final SecretKey key;
  private final long expirationMs;
  private final long refreshExpirationMs;

  public JwtTokenProvider(
      @Value("${jwt.secret}") String secret,
      @Value("${jwt.expiration-ms}") long expirationMs,
      @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMs;
    this.refreshExpirationMs = refreshExpirationMs;
  }

  /** Short-lived token carrying the authorisation claims, sent in the Authorization header. */
  public String generateToken(User user) {
    return build(user, expirationMs, TYPE_ACCESS)
        .claim("email", user.getEmail())
        .claim("role", user.getRole().getValue())
        .claim("division_id", user.getDivisionId() != null ? user.getDivisionId().toString() : null)
        .compact();
  }

  /**
   * Long-lived token held only in an HTTP-only cookie. Deliberately carries no role or division
   * claim: authorisation is re-read from the database when it is exchanged, so a role change takes
   * effect on the next refresh rather than after seven days.
   */
  public String generateRefreshToken(User user) {
    return build(user, refreshExpirationMs, TYPE_REFRESH).claim("email", user.getEmail()).compact();
  }

  public String getEmail(String token) {
    return parseClaims(token).get("email", String.class);
  }

  public String getSubject(String token) {
    return parseClaims(token).getSubject();
  }

  /** True only for a well-formed, unexpired <em>access</em> token. */
  public boolean isValidToken(String token) {
    return isValidTokenOfType(token, TYPE_ACCESS);
  }

  /** True only for a well-formed, unexpired <em>refresh</em> token. */
  public boolean isValidRefreshToken(String token) {
    return isValidTokenOfType(token, TYPE_REFRESH);
  }

  public String getEmailFromRefreshToken(String token) {
    return getEmail(token);
  }

  public long getRefreshExpirationSeconds() {
    return refreshExpirationMs / 1000;
  }

  private io.jsonwebtoken.JwtBuilder build(User user, long lifetimeMs, String tokenType) {
    Date now = new Date();
    return Jwts.builder()
        .subject(user.getId().toString())
        .claim(CLAIM_TOKEN_TYPE, tokenType)
        .issuedAt(now)
        .expiration(new Date(now.getTime() + lifetimeMs))
        .signWith(key);
  }

  private boolean isValidTokenOfType(String token, String expectedType) {
    if (token == null || token.isBlank()) {
      return false;
    }
    try {
      return expectedType.equals(parseClaims(token).get(CLAIM_TOKEN_TYPE, String.class));
    } catch (Exception e) {
      return false;
    }
  }

  private Claims parseClaims(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }
}
