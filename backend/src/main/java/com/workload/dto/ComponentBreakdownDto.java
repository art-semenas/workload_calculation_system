package com.workload.dto;

import java.math.BigDecimal;

public record ComponentBreakdownDto(
    BigDecimal os, BigDecimal ps, BigDecimal video, BigDecimal records, BigDecimal repair) {}
