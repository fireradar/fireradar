package com.fireradar.service;

import com.fireradar.model.FireIncident;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface DataService {

    String[][] importCsvData(String url);

    List<Object[]> getDateRange();

    List<FireIncident> getData(LocalDate start, LocalDate end);

    Map<String, Long> getDataByCountryByDays(String countryIso3);
}