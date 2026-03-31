package com.workload.exception;

public class SummaryNotFoundException extends EntityNotFoundException {
    public SummaryNotFoundException(String identifier) {
        super("Summary", identifier);
    }
}
