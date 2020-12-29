package com.fireradar.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
public class CountryDetails {

    @JsonProperty("countryCodeIso3")
    private String countryCodeIso3;

    @JsonProperty("fireIncidents")
    private Map<String, Long> fireIncidents;

}