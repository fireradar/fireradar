package com.fireradar.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "FireIncident")
public class FireIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO, generator = "native")
    @GenericGenerator(name = "native", strategy = "native")
    @Column(name = "ID")
    @JsonIgnore
    private Long id;

    @Column(name = "acq_time")
//    @JsonProperty("acq_time")
    @JsonIgnore
    private String acq_time;

    @Column(name = "frp")
//    @JsonProperty("frp")
    @JsonIgnore
    private Double frp;

    @Column(name = "acq_date")
    @JsonProperty("acq_date")
    private LocalDate acq_date;

    @Column(name = "latitude")
    @JsonProperty("latitude")
    private Double latitude;

    @Column(name = "confidence")
//    @JsonProperty("confidence")
    @JsonIgnore
    private Double confidence;

    @Column(name = "scan")
//    @JsonProperty("scan")
    @JsonIgnore
    private Double scan;

    @Column(name = "version")
//    @JsonProperty("version")
    @JsonIgnore
    private String version;

    @Column(name = "brightness")
    @JsonProperty("brightness")
    private Double brightness;

    @Column(name = "bright_t31")
//    @JsonProperty("bright_t31")
    @JsonIgnore
    private Double bright_t31;

    @Column(name = "daynight")
//    @JsonProperty("daynight")
    @JsonIgnore
    private String daynight;

    @Column(name = "satellite")
//    @JsonProperty("satellite")
    @JsonIgnore
    private String satellite;

    @Column(name = "track")
//    @JsonProperty("track")
    @JsonIgnore
    private Double track;

    @Column(name = "longitude")
    @JsonProperty("longitude")
    private Double longitude;

    @Column(name = "countryCodeIso3")
    @JsonProperty("countryCodeIso3")
    private String countryCodeIso3;

}