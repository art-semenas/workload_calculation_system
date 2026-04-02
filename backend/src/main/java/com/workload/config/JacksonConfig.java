package com.workload.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;
import java.math.BigDecimal;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures Jackson to serialize BigDecimal without trailing zeros. This keeps the JSON API
 * consistent: values stored as DECIMAL(10,2) in PostgreSQL (e.g. 5.00) serialize as plain integers
 * (5) rather than 5.00, which matches client expectations and keeps existing tests valid.
 */
@Configuration
public class JacksonConfig {

  @Bean
  public Jackson2ObjectMapperBuilderCustomizer bigDecimalSerializerCustomizer() {
    return builder ->
        builder.serializerByType(BigDecimal.class, new StripTrailingZerosBigDecimalSerializer());
  }

  private static class StripTrailingZerosBigDecimalSerializer extends JsonSerializer<BigDecimal> {
    @Override
    public void serialize(BigDecimal value, JsonGenerator gen, SerializerProvider serializers)
        throws IOException {
      gen.writeNumber(value.stripTrailingZeros().toPlainString());
    }
  }
}
