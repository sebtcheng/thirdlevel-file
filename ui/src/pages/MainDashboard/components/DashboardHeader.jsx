import React from 'react';
import { House as FiHome } from '@phosphor-icons/react';
import { useAuth } from '../../../context/AuthContext';
import PageHeaderCard from '../../../components/PageHeaderCard.jsx';

const DashboardHeader = ({ recordCount, statusText = "Registry Verified" }) => {
  const { user } = useAuth();

  return (
    <PageHeaderCard title="Main Dashboard" subtitle={<>Third-Level Officials Inventory &amp; Monitoring • {recordCount} Records Loaded</>}>
<div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[15px] font-medium text-heading leading-tight">
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'System Admin'}
          </span>
          <span className="text-[13px] text-secondary">
            {user?.role || statusText}
          </span>
        </div>
      </div>
</PageHeaderCard>
  );
};

export default React.memo(DashboardHeader);
