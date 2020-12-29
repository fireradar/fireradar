package com.fireradar.controller;

import com.fireradar.model.CountryDetails;
import com.fireradar.model.FireIncident;
import com.fireradar.service.DataService;
import com.fireradar.utils.DateUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.recurse.geocoding.reverse.Country;
import uk.recurse.geocoding.reverse.ReverseGeocoder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = {"*"}, allowCredentials = "true", allowedHeaders = {"*"})
@Slf4j
@RestController
public class DataController {

    @Autowired
    private DataService dataService;

    @GetMapping("/api/country")
    public String getCountry(@RequestParam("latitude") Optional<Double> latitude,
                             @RequestParam("longitude") Optional<Double> longitude) {
        String result = null;
        if (latitude.isPresent() && longitude.isPresent()) {
            ReverseGeocoder geocoder = new ReverseGeocoder();
            Optional<Country> country = geocoder.getCountry(latitude.get(), longitude.get());
            if (country.isPresent()) {
                result = country.get().iso3();
            }
        }
        return result;
    }

    @GetMapping("/api/country-details")
    public CountryDetails getCountryDetails(@RequestParam("country") String countryIso3) {
        CountryDetails result = new CountryDetails();
        result.setCountryCodeIso3(countryIso3);

        Map<String, Long> fireIncidentsByCountry = dataService.getDataByCountryByDays(countryIso3);

        result.setFireIncidents(fireIncidentsByCountry);

        return result;
    }

    @GetMapping("/api/data")
    public List<FireIncident> getData(@RequestParam("start") String start,
                                      @RequestParam("end") String end,
                                      @RequestParam("latitude") Optional<Double> latitude,
                                      @RequestParam("longitude") Optional<Double> longitude) {
        return dataService.getData(DateUtils.parseIsoDate(start), DateUtils.parseIsoDate(end));
    }

    @GetMapping("/api/date-range")
    public List<String> getDateRange() {
        List<String> result = new ArrayList<>();
        List<Object[]> dateRange = dataService.getDateRange();

        if (!dateRange.isEmpty()) {
            Object[] dates = dateRange.get(0);
            if (dates[0] != null) {
                result.add(DateUtils.formatIsoDate((LocalDate) dates[0]));
                result.add(DateUtils.formatIsoDate((LocalDate) dates[1]));
            }
        }

        return result;
    }

}