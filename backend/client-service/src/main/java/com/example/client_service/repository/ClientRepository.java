package com.example.client_service.repository;

import com.example.client_service.model.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findAllByDeletedAtIsNull();

    List<Client> findAllByAssignedAgentIdAndDeletedAtIsNull(UUID assignedAgentId);

    Page<Client> findAllByDeletedAtIsNull(Pageable pageable);

    Page<Client> findAllByAssignedAgentIdAndDeletedAtIsNull(UUID assignedAgentId, Pageable pageable);

    long countByDeletedAtIsNull();

    long countByAssignedAgentIdAndDeletedAtIsNull(UUID assignedAgentId);

    boolean existsByEmailAddressAndDeletedAtIsNull(String emailAddress);

    boolean existsByEmailAddressAndClientIdNotAndDeletedAtIsNull(String emailAddress, UUID clientId);

}
