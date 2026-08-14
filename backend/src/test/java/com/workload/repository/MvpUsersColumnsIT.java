package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * MVP M-02 adds two brute-force protection columns to {@code users}. They are deliberately excluded
 * from the PoC schema (see {@code poc-scope.md}), so this verifies the v1.1.0 migration applies.
 */
class MvpUsersColumnsIT extends IntegrationTestBase {

  @Autowired private JdbcTemplate jdbcTemplate;

  @Test
  void mvpUsersColumnsExist() {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.columns"
                + " WHERE table_name = 'users'"
                + " AND column_name IN ('failed_login_count', 'locked_until')",
            Integer.class);

    assertThat(count).isEqualTo(2);
  }

  @Test
  void failedLoginCountIsNotNullWithZeroDefault() {
    String isNullable =
        jdbcTemplate.queryForObject(
            "SELECT is_nullable FROM information_schema.columns"
                + " WHERE table_name = 'users' AND column_name = 'failed_login_count'",
            String.class);
    String columnDefault =
        jdbcTemplate.queryForObject(
            "SELECT column_default FROM information_schema.columns"
                + " WHERE table_name = 'users' AND column_name = 'failed_login_count'",
            String.class);

    assertThat(isNullable).isEqualTo("NO");
    assertThat(columnDefault).startsWith("0");
  }

  @Test
  void lockedUntilIsNullable() {
    String isNullable =
        jdbcTemplate.queryForObject(
            "SELECT is_nullable FROM information_schema.columns"
                + " WHERE table_name = 'users' AND column_name = 'locked_until'",
            String.class);

    assertThat(isNullable).isEqualTo("YES");
  }
}
