package com.fireradar.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.IOException;

@Slf4j
@Controller
public class IndexController {

    @RequestMapping(value = "/")
    public ResponseEntity<InputStreamResource> index() throws IOException {
        ClassPathResource indexFile = new ClassPathResource("public/index.html");
        return ResponseEntity
                .ok()
                .contentType(MediaType.TEXT_HTML)
                .body(new InputStreamResource(indexFile.getInputStream()));
    }
}