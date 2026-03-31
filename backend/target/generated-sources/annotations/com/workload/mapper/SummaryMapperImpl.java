package com.workload.mapper;

import com.workload.dto.SummaryDto;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-31T22:13:47+0300",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Amazon.com Inc.)"
)
@Component
public class SummaryMapperImpl implements SummaryMapper {

    @Override
    public SummaryDto toDto(Summary entity) {
        if ( entity == null ) {
            return null;
        }

        UUID objectId = null;
        UUID id = null;
        BigDecimal osR1PerVisit = null;
        BigDecimal osR2PerVisit = null;
        BigDecimal psR1PerVisit = null;
        BigDecimal psR2PerVisit = null;
        BigDecimal videoR1PerVisit = null;
        BigDecimal videoR2PerVisit = null;
        BigDecimal r1PerVisitTotal = null;
        BigDecimal r2PerVisitTotal = null;
        BigDecimal osMonthlyAvg = null;
        BigDecimal psMonthlyAvg = null;
        BigDecimal videoMonthlyAvg = null;
        BigDecimal recordsMonthly = null;
        BigDecimal repairNoTravelMonthly = null;
        BigDecimal repairWithTravelMonthly = null;
        BigDecimal roundTripMin = null;
        BigDecimal pzvMinutes = null;
        BigDecimal totalNoTravelMin = null;
        BigDecimal itogoChisloNoTravel = null;
        BigDecimal totalWithTravelMin = null;
        BigDecimal itogoChisloWithTravel = null;
        OffsetDateTime computedAt = null;

        objectId = entityObjectId( entity );
        id = entity.getId();
        osR1PerVisit = entity.getOsR1PerVisit();
        osR2PerVisit = entity.getOsR2PerVisit();
        psR1PerVisit = entity.getPsR1PerVisit();
        psR2PerVisit = entity.getPsR2PerVisit();
        videoR1PerVisit = entity.getVideoR1PerVisit();
        videoR2PerVisit = entity.getVideoR2PerVisit();
        r1PerVisitTotal = entity.getR1PerVisitTotal();
        r2PerVisitTotal = entity.getR2PerVisitTotal();
        osMonthlyAvg = entity.getOsMonthlyAvg();
        psMonthlyAvg = entity.getPsMonthlyAvg();
        videoMonthlyAvg = entity.getVideoMonthlyAvg();
        recordsMonthly = entity.getRecordsMonthly();
        repairNoTravelMonthly = entity.getRepairNoTravelMonthly();
        repairWithTravelMonthly = entity.getRepairWithTravelMonthly();
        roundTripMin = entity.getRoundTripMin();
        pzvMinutes = entity.getPzvMinutes();
        totalNoTravelMin = entity.getTotalNoTravelMin();
        itogoChisloNoTravel = entity.getItogoChisloNoTravel();
        totalWithTravelMin = entity.getTotalWithTravelMin();
        itogoChisloWithTravel = entity.getItogoChisloWithTravel();
        computedAt = entity.getComputedAt();

        SummaryDto summaryDto = new SummaryDto( id, objectId, osR1PerVisit, osR2PerVisit, psR1PerVisit, psR2PerVisit, videoR1PerVisit, videoR2PerVisit, r1PerVisitTotal, r2PerVisitTotal, osMonthlyAvg, psMonthlyAvg, videoMonthlyAvg, recordsMonthly, repairNoTravelMonthly, repairWithTravelMonthly, roundTripMin, pzvMinutes, totalNoTravelMin, itogoChisloNoTravel, totalWithTravelMin, itogoChisloWithTravel, computedAt );

        return summaryDto;
    }

    private UUID entityObjectId(Summary summary) {
        ObjectEntity object = summary.getObject();
        if ( object == null ) {
            return null;
        }
        return object.getId();
    }
}
