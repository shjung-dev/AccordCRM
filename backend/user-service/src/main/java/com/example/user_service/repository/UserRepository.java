package com.example.user_service.repository;

import com.example.user_service.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAddress(String emailAddress);
    List<User> findAllByDeletedAtIsNull();
    List<User> findAllByIsAdminFalse();
    Page<User> findAllByDeletedAtIsNull(Pageable pageable);
    Page<User> findAllByIsAdminFalseAndDeletedAtIsNull(Pageable pageable);
    Optional<User> findByEmailAddressAndDeletedAtIsNull(String emailAddress);
    Optional<User> findByCognitoSubAndDeletedAtIsNull(String cognitoSub);
}
