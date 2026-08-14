package com.workload.mapper;

import com.workload.dto.AdminUserDto;
import com.workload.dto.UserDto;
import com.workload.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

  UserDto toDto(User user);

  AdminUserDto toAdminDto(User user);
}
