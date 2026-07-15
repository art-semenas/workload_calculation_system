package com.workload.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workload.dto.ApiError;
import com.workload.dto.ApiMeta;
import com.workload.dto.ApiResponse;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

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
    ApiResponse<Void> response =
        ApiResponse.error(ApiError.of(HttpStatus.UNPROCESSABLE_ENTITY, "failure"));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"data\":null");
    assertThat(json).contains("\"error\"");
    assertThat(json).contains("422");
  }

  @Test
  void errorEnvelopeUsesNumericCode() throws Exception {
    ApiResponse<Void> response =
        ApiResponse.error(
            ApiError.of(HttpStatus.CONFLICT, "A division with this name already exists"));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"code\":409");
    assertThat(json).contains("\"data\":null");
    assertThat(json).doesNotContain("NAME_CONFLICT");
  }
}
