package com.fireradar.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.client.HttpStatusCodeException;

import javax.servlet.http.HttpServletRequest;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(HttpStatusCodeException.class)
    public ResponseEntity<?> handleHttpStatusCodeException(HttpStatusCodeException ex) {
        log.error("Http Status Code Error:", ex);
        return ResponseEntity.status(ex.getStatusCode()).headers(ex.getResponseHeaders()).body(ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error:", ex);
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
