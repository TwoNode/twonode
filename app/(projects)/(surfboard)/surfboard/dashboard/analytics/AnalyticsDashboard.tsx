"use client"

import React, { useEffect, useState } from 'react';
import { FiUsers, FiMapPin, FiClock, FiFileText, FiPieChart, FiLayers } from 'react-icons/fi';
import { BarChart } from './BarChart';
import { PieChart, generateColors } from './PieChart';
import { StatsCard } from './StatsCard';
import { surfboardApi } from '@/surfboard/apiClient';
import type { AnalyticsData } from '@/app/(projects)/(surfboard)/types/surfboardTypes';
import type { DimensionBreakdownRow } from '@/surfboard/services/analyticsService';

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wardStats, setWardStats] = useState<DimensionBreakdownRow[]>([]);
  const [lcdaStats, setLcdaStats] = useState<DimensionBreakdownRow[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const result = await surfboardApi.analytics.dashboard();

        if (result.success) {
          setAnalytics(result.data);
        } else {
          setError(result.error || 'Failed to load analytics data');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Ward/LCDA breakdowns come from the newer generic dimension endpoint —
    // fetched separately so a failure here never blocks the main dashboard.
    const fetchAreaBreakdowns = async () => {
      try {
        const [wardResult, lcdaResult] = await Promise.all([
          surfboardApi.analytics.dimension('ward'),
          surfboardApi.analytics.dimension('lcda'),
        ]);
        if (wardResult.success) setWardStats(wardResult.data);
        if (lcdaResult.success) setLcdaStats(lcdaResult.data);
      } catch (err) {
        console.error('Error fetching ward/LCDA breakdowns:', err);
      }
    };

    fetchAreaBreakdowns();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const facilitatorData = analytics.facilitatorStats.map(item => ({
    label: item.facilitator || 'Unknown',
    value: item.count,
  }));

  const lgaData = analytics.lgaStats.map(item => ({
    label: item.lga || 'Unknown',
    value: item.count,
  }));

  const wardData = wardStats.map(item => ({
    label: item.key || 'Unknown',
    value: item.count,
  }));

  const lcdaData = lcdaStats.map(item => ({
    label: item.key || 'Unknown',
    value: item.count,
  }));

  const pillarData = analytics.pillarStats.map((item, index) => ({
    label: item.type,
    value: item.count,
    color: generateColors(analytics.pillarStats.length)[index],
  }));

  const regularPillars = analytics.pillarStats.find(p => p.isRegular)?.count || 0;
  const specialPillars = analytics.pillarStats.reduce((sum, p) => sum + (p.isRegular ? 0 : p.count), 0);
  const totalPillars = regularPillars + specialPillars;
  
  const pillarTypeData = [
    { label: 'Regular', value: regularPillars, color: '#10B981' },
    { label: 'Special', value: specialPillars, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Plans"
          value={analytics.totalPlansCount}
          icon={<FiLayers className="w-6 h-6" />}
          color="blue"
        />
        
        <StatsCard
          title="Provisional Plans"
          value={analytics.provisionalPlansCount}
          icon={<FiFileText className="w-6 h-6" />}
          color="orange"
        />
        
        <StatsCard
          title="Pending Certificates"
          value={analytics.pendingCertificates.length}
          icon={<FiClock className="w-6 h-6" />}
          color="red"
        />
        
        <StatsCard
          title="Unique LGAs"
          value={analytics.lgaStats.length}
          icon={<FiMapPin className="w-6 h-6" />}
          color="green"
        />

        <StatsCard
          title="Unique LCDAs"
          value={lcdaStats.length}
          icon={<FiMapPin className="w-6 h-6" />}
          color="purple"
        />

        <StatsCard
          title="Unique Wards"
          value={wardStats.length}
          icon={<FiMapPin className="w-6 h-6" />}
          color="blue"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facilitator Stats */}
        <BarChart
          title="Records by Facilitator"
          subtitle="Top facilitators by number of records"
          data={facilitatorData}
          height={400}
          maxItems={8}
        />

        {/* LGA Distribution */}
        <BarChart
          title="Records by LGA"
          subtitle="Records distribution across Local Government Areas"
          data={lgaData}
          height={400}
          maxItems={8}
        />

        {/* LCDA Distribution */}
        <BarChart
          title="Records by LCDA"
          subtitle="Records distribution across Local Council Development Areas"
          data={lcdaData}
          height={400}
          maxItems={8}
        />

        {/* Ward Distribution */}
        <BarChart
          title="Records by Ward"
          subtitle="Records distribution across wards"
          data={wardData}
          height={400}
          maxItems={8}
        />

        {/* Pillar Type Analysis */}
        <PieChart
          title="Pillar Type Analysis"
          subtitle="Distribution of regular vs special pillars"
          data={pillarTypeData}
          donut
          donutLabel="Total Pillars"
          donutValue={totalPillars}
          height={400}
        />

        {/* Time Trends */}
        <BarChart
          title="Monthly Lodgements"
          subtitle="Number of plans lodged per month"
          data={analytics.timeTrends.map(item => ({
            label: item.period,
            value: item.count,
          }))}
          height={400}
          maxItems={12}
        />
      </div>
      
      {/* Pending Certificates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pending Certificates</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recently updated certificates awaiting approval</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Survey Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Facilitator
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
              {analytics.pendingCertificates.length > 0 ? (
                analytics.pendingCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {cert.planNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {cert.surveyTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {cert.facilitator}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(cert.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No pending certificates
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
