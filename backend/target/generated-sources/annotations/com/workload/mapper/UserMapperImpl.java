package com.workload.mapper;

import com.workload.dto.UserDto;
import com.workload.entity.Role;
import com.workload.entity.User;
import java.math.BigDecimal;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-31T22:13:46+0300",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Amazon.com Inc.)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserDto toDto(User user) {
        if ( user == null ) {
            return null;
        }

        UUID id = null;
        String email = null;
        String name = null;
        Role role = null;
        UUID divisionId = null;
        UUID homeDivisionId = null;
        BigDecimal capacityFte = null;
        String employeeId = null;
        boolean active = false;
        boolean requiresActivation = false;

        id = user.getId();
        email = user.getEmail();
        name = user.getName();
        role = user.getRole();
        divisionId = user.getDivisionId();
        homeDivisionId = user.getHomeDivisionId();
        capacityFte = user.getCapacityFte();
        employeeId = user.getEmployeeId();
        active = user.isActive();
        requiresActivation = user.isRequiresActivation();

        UserDto userDto = new UserDto( id, email, name, role, divisionId, homeDivisionId, capacityFte, employeeId, active, requiresActivation );

        return userDto;
    }
}
