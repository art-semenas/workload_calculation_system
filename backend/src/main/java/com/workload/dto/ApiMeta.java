package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiMeta(Long total, Integer page, @JsonProperty("per_page") Integer perPage) {}
