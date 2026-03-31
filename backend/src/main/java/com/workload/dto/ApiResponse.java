package com.workload.dto;

public record ApiResponse<T>(T data, ApiMeta meta, ApiError error) {

    public static <T> ApiResponse<T> success(T data, ApiMeta meta) {
        return new ApiResponse<>(data, meta, null);
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data, null, null);
    }

    public static <T> ApiResponse<T> error(ApiError error) {
        return new ApiResponse<>(null, null, error);
    }
}
