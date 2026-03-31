package com.workload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class WorkloadApplicationTest {

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void contextLoads() {
  }

  @Test
  void usersTableAndSeedAdminArePresent() {
    Integer tableCount = jdbcTemplate.queryForObject(
        """
            select count(*)
            from information_schema.tables
            where table_schema = 'public' and table_name = 'users'
            """,
        Integer.class);

    assertThat(tableCount).isEqualTo(1);

    // Role values are lowercase in the database (see db-schema.md)
    List<String> roles = jdbcTemplate.queryForList("select role from users", String.class);
    assertThat(roles).contains("admin");
  }
}
