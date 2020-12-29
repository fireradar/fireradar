package com.fireradar.repository;

import com.fireradar.model.FireIncident;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FireIncidentRepository extends CrudRepository<FireIncident, Long> {

    @Query("select DISTINCT min(r.acq_date), max(r.acq_date) from FireIncident r")
    List<Object[]> getDateRange();

    @Query("select r from FireIncident r " +
            "where r.acq_date between :start and :end ")
    List<FireIncident> getData(@Param("start") LocalDate startDate,
                               @Param("end") LocalDate endDate);

    @Query("select r.acq_date, count(r.acq_date) from FireIncident r " +
            "where r.acq_date between :start and :end " +
            "and r.countryCodeIso3 = :countryIso3 " +
            "group by r.acq_date")
    Object[] getDataByCountryByDays(@Param("start") LocalDate startDate,
                                    @Param("end") LocalDate endDate,
                                    @Param("countryIso3") String countryIso3);
}