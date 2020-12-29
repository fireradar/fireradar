package com.fireradar.service;

import com.fireradar.model.FireIncident;
import com.fireradar.repository.FireIncidentRepository;
import com.fireradar.utils.DateUtils;
import com.fireradar.utils.csv.CsvUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.supercsv.io.CsvMapReader;
import org.supercsv.io.ICsvMapReader;
import org.supercsv.prefs.CsvPreference;
import uk.recurse.geocoding.reverse.ReverseGeocoder;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static java.time.temporal.ChronoUnit.DAYS;

@Slf4j
@Service
public class DataServiceImpl implements DataService {

    public static final CsvPreference EXCEL_PREFERENCE = new CsvPreference.Builder('\"', ',', "\n").build();

    @Autowired
    private FireIncidentRepository fireIncidentRepository;

    @Override
    public String[][] importCsvData(String urlString) {
        try {
            DateFormat formatter = new SimpleDateFormat("HH:mm:ss.SSS");
            formatter.setTimeZone(TimeZone.getTimeZone("UTC"));

            Long startTime = System.currentTimeMillis();
            log.info("1: 0");
            URL url = new URL(urlString);
            InputStream is = url.openStream();
            log.info("2: " + (formatter.format(new Date(System.currentTimeMillis() - startTime))));
            ICsvMapReader csvMapReader = new CsvMapReader(new BufferedReader(new InputStreamReader(is)), EXCEL_PREFERENCE);
            log.info("3: " + (formatter.format(new Date(System.currentTimeMillis() - startTime))));
            final String[] headers = csvMapReader.getHeader(false);

            List<FireIncident> fireIncidents = new ArrayList<>();
            Map<String, String> csvRow;
            while ((csvRow = csvMapReader.read(headers)) != null) {
                CsvUtils.trimHeaders(csvRow);
                if (CsvUtils.isRowEmpty(csvRow)) continue;

                FireIncident fireIncident = new FireIncident();
                fireIncident.setAcq_time(csvRow.get("acq_time"));
                fireIncident.setFrp(Double.valueOf(csvRow.get("frp")));
                fireIncident.setAcq_date(LocalDate.parse(csvRow.get("acq_date"), DateTimeFormatter.ofPattern("yyyy-MM-dd")));
                fireIncident.setLatitude(Double.valueOf(csvRow.get("latitude")));
                fireIncident.setConfidence(Double.valueOf(csvRow.get("confidence")));
                fireIncident.setScan(Double.valueOf(csvRow.get("scan")));
                fireIncident.setVersion(csvRow.get("version"));
                fireIncident.setBrightness(Double.valueOf(csvRow.get("brightness")));
                fireIncident.setBright_t31(Double.valueOf(csvRow.get("bright_t31")));
                fireIncident.setDaynight(csvRow.get("daynight"));
                fireIncident.setSatellite(csvRow.get("satellite"));
                fireIncident.setTrack(Double.valueOf(csvRow.get("track")));
                fireIncident.setLongitude(Double.valueOf(csvRow.get("longitude")));

                fireIncidents.add(fireIncident);
            }
            is.close();

            log.info("4: " + (formatter.format(new Date(System.currentTimeMillis() - startTime))));
            ReverseGeocoder geocoder = new ReverseGeocoder();
            for (FireIncident fireIncident : fireIncidents) {
                geocoder.getCountry(fireIncident.getLatitude(), fireIncident.getLongitude()).ifPresent(country -> {
                    fireIncident.setCountryCodeIso3(country.iso3());
                });
            }

            log.info("5: " + (formatter.format(new Date(System.currentTimeMillis() - startTime))));
            saveRecords(fireIncidents);
            log.info("6: " + (formatter.format(new Date(System.currentTimeMillis() - startTime))));
            log.info("Records count: " + fireIncidentRepository.count());
            return new String[0][0];
        } catch (Exception e) {
            e.printStackTrace();
        }

        return null;
    }

    private void saveRecords(List<FireIncident> fireIncidents) {
        if (!fireIncidents.isEmpty()) {
            for (FireIncident fireIncident : fireIncidents) {
                try {
                    fireIncidentRepository.save(fireIncident);
                } catch (DataIntegrityViolationException e) {
                    if (e.getMostSpecificCause().getMessage().contains("IDX_FIREINCIDENT_UNIQUE")) {
                        // ignore index violation, just skip duplicates
                    } else {
                        throw e;
                    }
                }
            }
        }
    }

    @Scheduled(fixedRate = 1000 * 60 * 60 * 3) // import new data every 3 hours
//    @Scheduled(cron = "0 0 20 * * *") // import every 20:00
    public void importNewData() {
        this.importCsvData("https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6/csv/MODIS_C6_Global_7d.csv");
    }

    public List<Object[]> getDateRange() {
        return fireIncidentRepository.getDateRange();
    }

    @Override
    public List<FireIncident> getData(LocalDate start, LocalDate end) {
        return fireIncidentRepository.getData(start, end);
    }

    @Override
    public Map<String, Long> getDataByCountryByDays(String countryIso3) {
        int daysBackToLoad = 30;
        LocalDate start = LocalDate.now().minusDays(daysBackToLoad);
        LocalDate end = LocalDate.now();

        Map<String, Long> result = new HashMap<>();
        Object[] dataByCountryByDays = fireIncidentRepository.getDataByCountryByDays(start, end, countryIso3);

        Map<LocalDate, Long> dataByCountryByDaysMap = new HashMap<>();
        for (Object dataByCountryByDay : dataByCountryByDays) {
            dataByCountryByDaysMap.put((LocalDate) ((Object[]) dataByCountryByDay)[0], (Long) ((Object[]) dataByCountryByDay)[1]);
        }

        for (int i = 0; i < daysBackToLoad + 1; i++) {
            LocalDate date = start.plus(i, DAYS);
            result.put(DateUtils.formatIsoDate(date), dataByCountryByDaysMap.get(date) != null ? dataByCountryByDaysMap.get(date) : 0L);
        }

        return result;
    }
}