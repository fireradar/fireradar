package com.fireradar.utils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

public class DateUtils {

    private DateUtils() {
    }

    public static LocalDate parseIsoDate(String date) {
        Objects.requireNonNull(date, "Parsed date should not be null");
        return LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
    }

    public static String formatIsoDate(LocalDate date) {
        return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

}