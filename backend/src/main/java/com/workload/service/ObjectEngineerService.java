package com.workload.service;

import com.workload.constant.WorkloadStatus;
import com.workload.dto.EngineerObjectDto;
import com.workload.dto.EngineerShareDto;
import com.workload.dto.ObjectEngineerAssignmentDto;
import com.workload.entity.EngineerSummary;
import com.workload.entity.ObjectEngineer;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.entity.User;
import com.workload.exception.AssignmentNotFoundException;
import com.workload.exception.EngineerInactiveException;
import com.workload.exception.InvalidEngineerRoleException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.ObjectEngineerMapper;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing object-engineer assignments. Handles assignment creation, deletion, and
 * share calculations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ObjectEngineerService {

  private static final int SHARE_SCALE = 10;

  private final ObjectEngineerRepository objectEngineerRepository;
  private final SummaryRepository summaryRepository;
  private final EngineerSummaryRepository engineerSummaryRepository;
  private final UserRepository userRepository;
  private final ObjectRepository objectRepository;
  private final EngineerSummaryService engineerSummaryService;
  private final ObjectEngineerMapper objectEngineerMapper;

  /**
   * Retrieves all engineers assigned to an object with their computed shares.
   *
   * <p>objectShare = itogo_chislo_with_travel / engineer_count for this object
   *
   * @param objectId the object ID
   * @return list of engineers with their shares
   */
  @Transactional(readOnly = true)
  public List<EngineerShareDto> getEngineersForObject(UUID objectId) {
    List<ObjectEngineer> assignments = objectEngineerRepository.findAllByObjectId(objectId);

    Optional<Summary> summaryOpt = summaryRepository.findByObjectId(objectId);
    BigDecimal itogo =
        summaryOpt
            .map(Summary::getItogoChisloWithTravel)
            .filter(val -> val != null)
            .orElse(BigDecimal.ZERO);

    int engineerCount = assignments.size();
    BigDecimal countBd = BigDecimal.valueOf(engineerCount);

    return assignments.stream()
        .map(
            assignment -> {
              User engineer = assignment.getEngineer();
              UUID engineerId = engineer.getId();

              BigDecimal objectShare =
                  engineerCount > 0
                      ? itogo.divide(countBd, SHARE_SCALE, RoundingMode.HALF_UP)
                      : BigDecimal.ZERO;

              Optional<EngineerSummary> summaryOpt2 =
                  engineerSummaryRepository.findByEngineerId(engineerId);

              BigDecimal totalLoad = BigDecimal.ZERO;
              BigDecimal loadRatio = BigDecimal.ZERO;
              WorkloadStatus status = WorkloadStatus.NORMAL;

              if (summaryOpt2.isPresent()) {
                EngineerSummary es = summaryOpt2.get();
                totalLoad = es.getTotalLoad() != null ? es.getTotalLoad() : BigDecimal.ZERO;
                loadRatio = es.getLoadRatio() != null ? es.getLoadRatio() : BigDecimal.ZERO;
                status = WorkloadStatus.fromString(es.getStatus());
              }

              return new EngineerShareDto(
                  engineerId,
                  engineer.getName(),
                  objectShare,
                  totalLoad,
                  loadRatio,
                  status,
                  assignment.getAssignedAt());
            })
        .toList();
  }

  /**
   * Retrieves all objects assigned to an engineer with their computed shares.
   *
   * <p>engineerShare = itogo_chislo_with_travel / engineer_count for each object
   *
   * @param engineerId the engineer ID
   * @return list of objects with the engineer's share on each
   */
  @Transactional(readOnly = true)
  public List<EngineerObjectDto> getObjectsForEngineer(UUID engineerId) {
    List<ObjectEngineer> assignments = objectEngineerRepository.findAllByEngineerId(engineerId);

    return assignments.stream()
        .map(
            assignment -> {
              ObjectEntity object = assignment.getObject();
              UUID objectId = object.getId();

              Optional<Summary> summaryOpt = summaryRepository.findByObjectId(objectId);
              BigDecimal itogo =
                  summaryOpt
                      .map(Summary::getItogoChisloWithTravel)
                      .filter(val -> val != null)
                      .orElse(BigDecimal.ZERO);

              int engineerCount = objectEngineerRepository.countByObjectId(objectId);
              BigDecimal countBd = BigDecimal.valueOf(Math.max(engineerCount, 1));

              BigDecimal engineerShare = itogo.divide(countBd, SHARE_SCALE, RoundingMode.HALF_UP);

              String branchName = object.getBranch() != null ? object.getBranch().getName() : "";
              String divisionName =
                  object.getBranch() != null && object.getBranch().getDivision() != null
                      ? object.getBranch().getDivision().getName()
                      : "";

              return new EngineerObjectDto(
                  objectId,
                  object.getName(),
                  branchName,
                  divisionName,
                  engineerShare,
                  itogo,
                  engineerCount,
                  assignment.getAssignedAt());
            })
        .toList();
  }

  /**
   * Assigns an engineer to an object.
   *
   * <p>Validates: 1. Engineer exists and role is 'engineer' 2. Engineer is active 3. Object exists
   * 4. No duplicate assignment (caught at save)
   *
   * <p>After assignment, recalculates all engineer summaries for the object.
   *
   * <p>PoC (S-02): recalculates all affected engineer summaries synchronously.
   *
   * @param objectId the object ID
   * @param engineerId the engineer ID
   * @return DTO representation of the created assignment
   * @throws EntityNotFoundException if engineer or object not found
   * @throws RequestValidationException if engineer is inactive or not an engineer
   * @throws DataIntegrityViolationException if assignment already exists
   */
  @Transactional
  public ObjectEngineerAssignmentDto assignEngineerToObject(UUID objectId, UUID engineerId) {
    // Validate engineer exists
    User engineer =
        userRepository
            .findById(engineerId)
            .orElseThrow(
                () ->
                    new com.workload.exception.EntityNotFoundException(
                        "Engineer", engineerId.toString()));

    // Assignable by job function, not permission tier — an engineer may hold any role.
    if (!engineer.isEngineer()) {
      throw new InvalidEngineerRoleException(engineerId.toString(), engineer.getRole().getValue());
    }

    // Validate engineer is active
    if (!engineer.isActive()) {
      throw new EngineerInactiveException(engineerId.toString());
    }

    // Validate object exists
    ObjectEntity object =
        objectRepository
            .findById(objectId)
            .orElseThrow(() -> new ObjectNotFoundException(objectId.toString()));

    // Create and save assignment
    ObjectEngineer assignment =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .object(object)
            .assignedAt(OffsetDateTime.now())
            .build();

    try {
      ObjectEngineer saved = objectEngineerRepository.save(assignment);
      log.info("Assigned engineer {} to object {}", engineerId, objectId);

      // PoC (S-02): recalculates all affected engineer summaries synchronously.
      engineerSummaryService.recalculateAllForObject(objectId);

      return objectEngineerMapper.toAssignmentDto(saved);
    } catch (DataIntegrityViolationException ex) {
      log.warn("Duplicate assignment attempt: engineer {} to object {}", engineerId, objectId);
      throw ex;
    }
  }

  /**
   * Removes an engineer from an object.
   *
   * <p>Deletes the ObjectEngineer row and recalculates summaries for both the object (all remaining
   * engineers) and the removed engineer.
   *
   * @param objectId the object ID
   * @param engineerId the engineer ID
   * @throws EntityNotFoundException if assignment does not exist
   */
  @Transactional
  public void removeEngineerFromObject(UUID objectId, UUID engineerId) {
    ObjectEngineer assignment =
        objectEngineerRepository
            .findByObjectIdAndEngineerId(objectId, engineerId)
            .orElseThrow(
                () -> new AssignmentNotFoundException(objectId.toString(), engineerId.toString()));

    objectEngineerRepository.delete(assignment);
    log.info("Removed engineer {} from object {}", engineerId, objectId);

    // PoC (S-02): recalculates all affected engineer summaries synchronously.
    engineerSummaryService.recalculateAllForObject(objectId);
    engineerSummaryService.recalculate(engineerId);
  }
}
