
from backend.main import app, db
from backend.models import Role, Permission, RolePermission, TeamMember, TeamInvitation, UserRole

def cleanup_roles():
    with app.app_context():
        print("--- Analyzing Roles ---")
        roles = Role.query.all()
        role_map = {}
        
        for r in roles:
            name_norm = r.name.upper().strip()
            if name_norm not in role_map:
                role_map[name_norm] = []
            role_map[name_norm].append(r)
            
        for name, duplicates in role_map.items():
            if len(duplicates) > 1:
                print(f"Found duplicates for {name}: {[d.id for d in duplicates]}")
                # Keep the first one (usually lowest ID)
                keep = duplicates[0]
                remove = duplicates[1:]
                
                print(f"Keeping ID {keep.id}, removing IDs {[r.id for r in remove]}")
                
                for r in remove:
                    # Remap TeamMembers
                    TeamMember.query.filter_by(role_id=r.id).update({"role_id": keep.id})
                    # Remap TeamInvitations
                    TeamInvitation.query.filter_by(role_id=r.id).update({"role_id": keep.id})
                    # Remap UserRoles
                    UserRole.query.filter_by(role_id=r.id).update({"role_id": keep.id})
                    # Delete RolePermissions
                    RolePermission.query.filter_by(role_id=r.id).delete()
                    
                    # Delete Role
                    db.session.delete(r)
                
                db.session.commit()
                print(f"Merged {name} successfully.")
            else:
                print(f"Role {name} is unique (ID: {duplicates[0].id})")

        # Explicit Merges (English -> Spanish)
        merges = {
            "SELLER": "VENTAS",
            "FINANCE": "CONTABILIDAD",
            "ADMIN": "ADMIN" # Keep ADMIN, maybe merge SUPERADMIN? No, keep separate for now.
        }

        for source_name, target_name in merges.items():
            if source_name in role_map and target_name in role_map:
                source = role_map[source_name][0]
                target = role_map[target_name][0]
                
                if source.id != target.id:
                    print(f"Merging {source.name} (ID {source.id}) into {target.name} (ID {target.id})")
                    # Remap
                    TeamMember.query.filter_by(role_id=source.id).update({"role_id": target.id})
                    TeamInvitation.query.filter_by(role_id=source.id).update({"role_id": target.id})
                    UserRole.query.filter_by(role_id=source.id).update({"role_id": target.id})
                    RolePermission.query.filter_by(role_id=source.id).delete()
                    
                    db.session.delete(source)
                    db.session.commit()
                    print(f"Merged {source.name} into {target.name}")
                    

if __name__ == "__main__":
    cleanup_roles()
