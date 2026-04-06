package com.workload.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workload.dto.ApiError;
import com.workload.dto.ApiMeta;
import com.workload.dto.ApiResponse;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ApiResponseSerializationTest {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void serializesSuccessEnvelope() throws Exception {
    ApiResponse<Map<String, String>> response =
        ApiResponse.success(Map.of("status", "ok"), new ApiMeta(1L, 1, 50));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"data\"");
    assertThat(json).contains("\"meta\"");
    assertThat(json).contains("\"per_page\"");
    assertThat(json).contains("\"error\":null");
  }

  @Test
  void serializesErrorEnvelope() throws Exception {
    ApiResponse<Void> response = ApiResponse.error(new ApiError("TEST_ERROR", "failure", null));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"data\":null");
    assertThat(json).contains("\"error\"");
    assertThat(json).contains("TEST_ERROR");
  }

  @Test
  void serializesAffectedCountWhenPresent() throws Exception {
    ApiResponse<Void> response = ApiResponse.error(new ApiError("TEST_ERROR", "failure", 3));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"affected_count\"");
    assertThat(json).contains("3");
  }
}
