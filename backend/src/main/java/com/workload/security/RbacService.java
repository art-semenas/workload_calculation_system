package com.workload.security;

import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.repository.BranchRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Division-scoped authorisation (TOR §12), reversing PoC simplification S-04.
 *
 * <p>Role-only rules — admin-only endpoints — are expressed declaratively with
 * {@code @PreAuthorize} on the controller. This service exists for the rules that depend on *which*
 * row is being touched, which an annotation cannot express: an editor may write objects in their
 * own division only.
 *
 * <p>Every denial throws {@link AccessDeniedException} so it lands on the same handler as
 * annotation-level denials and the client sees one consistent 403 envelope.
 */
@Service
public class RbacService {

  private final UserRepository userRepository;
  private final ObjectRepository objectRepository;
  private final ObjectEngineerRepository objectEngineerRepository;
  private final BranchRepository branchRepository;

  public RbacService(
      UserRepository userRepository,
      ObjectRepository objectRepository,
      ObjectEngineerRepository objectEngineerRepository,
      BranchRepository branchRepository) {
    this.userRepository = userRepository;
    this.objectRepository = objectRepository;
    this.objectEngineerRepository = objectEngineerRepository;
    this.branchRepository = branchRepository;
  }

  /** The authenticated user, or {@link AccessDeniedException} if the context is empty. */
  public User currentUser() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || authentication.getName() == null) {
      throw new AccessDeniedException("Not authenticated");
    }
    return userRepository
        .findByEmail(authentication.getName())
        .orElseThrow(() -> new AccessDeniedException("Not authenticated"));
  }

  /**
   * Admin may write anywhere; an editor only within their own division. Viewers and engineers are
   * refused — engineers reach their own objects through {@link #requireCanEditObjectData} instead.
   */
  public void requireCanWriteObject(UUID objectId) {
    User user = currentUser();
    if (user.getRole() == Role.ADMIN) {
      return;
    }
    if (user.getRole() == Role.EDITOR && ownsDivisionOf(user, objectId)) {
      return;
    }
    throw new AccessDeniedException("Object is outside your division");
  }

  /**
   * Records and repairs additionally allow the engineer assigned to the object, who is the person
   * doing the work being recorded (TOR §12). Equipment and travel do not — those stay with admins
   * and editors.
   */
  public void requireCanEditObjectData(UUID objectId) {
    User user = currentUser();
    if (user.getRole() == Role.ADMIN) {
      return;
    }
    if (user.getRole() == Role.EDITOR && ownsDivisionOf(user, objectId)) {
      return;
    }
    // Keyed on the job function: the person doing the work may also hold an editor or viewer role.
    if (user.isEngineer() && isAssignedTo(user, objectId)) {
      return;
    }
    throw new AccessDeniedException("You may not edit data for this object");
  }

  /**
   * Scope a write that names a branch rather than an existing object — object creation. Without
   * this an editor could create objects in any division simply by choosing another branch.
   */
  public void requireCanWriteInBranch(UUID branchId) {
    User user = currentUser();
    if (user.getRole() == Role.ADMIN) {
      return;
    }
    UUID divisionId = branchRepository.findDivisionIdByBranchId(branchId).orElse(null);
    if (user.getRole() == Role.EDITOR
        && divisionId != null
        && divisionId.equals(user.getDivisionId())) {
      return;
    }
    throw new AccessDeniedException("Branch is outside your division");
  }

  // -------------------------------------------------------------------------
  // Read scoping (TOR §12): "They cannot view other engineers' rows, dashboards, or unassigned
  // objects." These rules key on the *role* — the permission tier — not on the engineer flag, so
  // an engineer who also holds the editor or admin role reads everything that role allows.
  // -------------------------------------------------------------------------

  /**
   * The engineer id that list reads must be narrowed to, or empty when the caller may read
   * everything. Callers pass it into the query rather than filtering afterwards: {@code /svod} is
   * paginated, so post-filtering a page would return short pages and a wrong total.
   */
  public Optional<UUID> readScopeEngineerId() {
    User user = currentUser();
    return user.getRole() == Role.ENGINEER ? Optional.of(user.getId()) : Optional.empty();
  }

  /** Detail reads of a single object. Filtering the list is pointless if the detail stays open. */
  public void requireCanReadObject(UUID objectId) {
    User user = currentUser();
    if (user.getRole() != Role.ENGINEER) {
      return;
    }
    if (isAssignedTo(user, objectId)) {
      return;
    }
    throw new AccessDeniedException("You may only view objects you are assigned to");
  }

  /** An engineer's own dashboard is theirs alone — objects, summary and load ratios. */
  public void requireCanReadEngineerData(UUID engineerId) {
    User user = currentUser();
    if (user.getRole() != Role.ENGINEER) {
      return;
    }
    if (user.getId().equals(engineerId)) {
      return;
    }
    throw new AccessDeniedException("You may only view your own engineer data");
  }

  private boolean ownsDivisionOf(User user, UUID objectId) {
    if (user.getDivisionId() == null) {
      return false;
    }
    return objectRepository
        .findDivisionIdByObjectId(objectId)
        .filter(user.getDivisionId()::equals)
        .isPresent();
  }

  private boolean isAssignedTo(User user, UUID objectId) {
    return objectEngineerRepository.findByObjectIdAndEngineerId(objectId, user.getId()).isPresent();
  }
}
