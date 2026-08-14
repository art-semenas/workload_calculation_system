package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * MVP M-02: {@code is_engineer} separates the job function from the permission tier, so an engineer
 * who is also an editor or admin stays an engineer. Added by v1.1.1, backfilled from the role.
 */
class EngineerFlagColumnIT extends IntegrationTestBase {

  @Autowired private JdbcTemplate jdbcTemplate;

  @Test
  void isEngineerColumnIsNotNullWithFalseDefault() {
    String isNullable =
        jdbcTemplate.queryForObject(
            "SELECT is_nullable FROM information_schema.columns"
                + " WHERE table_name = 'users' AND column_name = 'is_engineer'",
            String.class);
    String columnDefault =
        jdbcTemplate.queryForObject(
            "SELECT column_default FROM information_schema.columns"
                + " WHERE table_name = 'users' AND column_name = 'is_engineer'",
            String.class);

    assertThat(isNullable).isEqualTo("NO");
    assertThat(columnDefault).startsWith("false");
  }

  /**
   * The v1.1.1 backfill must leave no engineer-role account unflagged, and nothing in the
   * application may reintroduce one — an unflagged engineer would vanish from {@code GET
   * /engineers} while keeping their object assignments.
   */
  @Test
  void noEngineerRoleAccountIsLeftUnflagged() {
    Integer unflagged =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE role = 'engineer' AND is_engineer = false",
            Integer.class);

    assertThat(unflagged).isZero();
  }
}
