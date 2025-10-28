import { useState } from 'react';
import dayjs from 'dayjs';

const useDashboardFilters = () => {
  const [filters, setFilters] = useState({
    dateRange: [dayjs().subtract(24, 'hour'), dayjs()],
    hours: 24,
  });

  const handleDateRangeChange = (newRange) => {
    const hours = Math.abs(newRange[1].diff(newRange[0], 'hour'));
    setFilters({
      dateRange: newRange,
      hours: hours,
    });
  };

  const handleHoursChange = (hours) => {
    const endDate = dayjs();
    const startDate = endDate.subtract(hours, 'hour');
    setFilters({
      dateRange: [startDate, endDate],
      hours: hours,
    });
  };

  const resetFilters = () => {
    setFilters({
      dateRange: [dayjs().subtract(24, 'hour'), dayjs()],
      hours: 24,
    });
  };

  const hasActiveFilters = () => {
    return filters.hours !== 24;
  };

  return {
    filters,
    handleDateRangeChange,
    handleHoursChange,
    resetFilters,
    hasActiveFilters,
  };
};

export default useDashboardFilters;
