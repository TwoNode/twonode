"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, FileText, Clock } from 'lucide-react';
import { BarChart } from './BarChart';
import { PieChart, generateColors } from './PieChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { surfboardApi } from '@/surfboard/apiClient';
import { SURFBOARD_COLORS } from '@/surfboard/colors';
import type { DateRangeValue } from '@/components/dashboard/DateRangeFilter';
import type { AnalyticsData } from '@/app/(projects)/(surfboard)/types/surfboardTypes';
import type { DimensionBreakdownRow } from '@/surfboard/services/analyticsService';

const AREA_DIMENSIONS = [
  { id: 'lga', label: 'LGA' },
  { id: 'lcda', label: 'LCDA' },
  { id: 'ward', label: 'Ward' },
] as const;
type AreaDimension = (typeof AREA_DIMENSIONS)[number]['id'];

const CHART_HEIGHT = 400;

export interface PlanHealthSummary {
  lodged: number;
  totalPlans: number;
  queried: number;
  underReview: number;
  qrEarningsThisMonth: number;
}

export function AnalyticsDashboard({
  dateRange,
  planHealth,
}: {
  dateRange?: DateRangeValue;
  planHealth: PlanHealthSummary;
}) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wardStats, setWardStats] = useState<DimensionBreakdownRow[]>([]);
  const [lcdaStats, setLcdaStats] = useState<DimensionBreakdownRow[]>([]);
  const [areaDimension, setAreaDimension] = useState<AreaDimension>('lga');

  useEffect(() => {
    const range = { dateFrom: dateRange?.from, dateTo: dateRange?.to };

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const result = await surfboardApi.analytics.dashboard(range);

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
    // Both are fetched unconditionally (not just the selected one) so the
    // "Unique Wards/LCDAs" tiles and the dimension toggle below never need
    // a second round-trip when the user switches tabs.
    const fetchAreaBreakdowns = async () => {
      try {
        const [wardResult, lcdaResult] = await Promise.all([
          surfboardApi.analytics.dimension('ward', range),
          surfboardApi.analytics.dimension('lcda', range),
        ]);
        if (wardResult.success) setWardStats(wardResult.data);
        if (lcdaResult.success) setLcdaStats(lcdaResult.data);
      } catch (err) {
        console.error('Error fetching ward/LCDA breakdowns:', err);
      }
    };

    fetchAreaBreakdowns();
  }, [dateRange?.from, dateRange?.to]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 dark:bg-red-500/10 dark:border-red-500/60">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No analytics data available</p>
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

  const areaDataByDimension: Record<AreaDimension, typeof lgaData> = {
    lga: lgaData,
    lcda: lcdaData,
    ward: wardData,
  };

  const areaCountByDimension: Record<AreaDimension, number> = {
    lga: analytics.lgaStats.length,
    lcda: lcdaStats.length,
    ward: wardStats.length,
  };

  const regularPillars = analytics.pillarStats.find((p) => p.isRegular)?.count || 0;
  const specialPillars = analytics.pillarStats.find((p) => !p.isRegular)?.count || 0;
  const totalPillars = regularPillars + specialPillars;

  const pillarTypeData = [
    { label: 'Regular', value: regularPillars, color: '#10B981' },
    { label: 'Special', value: specialPillars, color: '#F59E0B' },
  ];

  const totalRecords = analytics.totalPlansCount + analytics.provisionalPlansCount;
  const provisionalShare = totalRecords > 0 ? Math.round((analytics.provisionalPlansCount / totalRecords) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview — each tile now carries a breakdown line for context instead of a bare number */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Plans"
          value={analytics.totalPlansCount}
          breakdown={`Pending ${analytics.pendingCount} · Lodged ${analytics.lodgedCount} · Queried ${analytics.queriedCount}`}
          icon={Layers}
          tone="brand"
        />

        <StatCard
          label="Provisional Plans"
          value={analytics.provisionalPlansCount}
          breakdown={`${provisionalShare}% of ${totalRecords} total records`}
          icon={FileText}
          tone="warning"
        />

        <StatCard
          label="Pending Certificates"
          value={analytics.pendingCertificatesCount}
          breakdown="Awaiting approval"
          icon={Clock}
          tone="warning"
        />

        <StatCard
          label="Facilitators"
          value={analytics.facilitatorStats.length}
          breakdown={
            analytics.facilitatorStats[0]
              ? `Top: ${analytics.facilitatorStats[0].facilitator} (${analytics.facilitatorStats[0].count})`
              : undefined
          }
          icon={Layers}
          tone="info"
        />
      </div>

      {/* Main Charts — two 3-up rows, in DOM order so the grid auto-flows correctly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Row 1: Facilitator Stats | Pillar Type Analysis | Plan Health */}
        <BarChart
          title="Records by Facilitator"
          subtitle="Top facilitators by number of records"
          data={facilitatorData}
          height={CHART_HEIGHT}
          maxItems={8}
        />

        <PieChart
          title="Pillar Type Analysis"
          subtitle="Distribution of regular vs special pillars"
          data={pillarTypeData}
          donut
          donutLabel="Total Pillars"
          donutValue={totalPillars}
          height={CHART_HEIGHT}
        />

        <div className="bg-white rounded-lg shadow p-6 dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Plan Health</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {planHealth.lodged} of {planHealth.totalPlans} plans lodged this cycle
          </p>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${planHealth.totalPlans > 0 ? Math.round((planHealth.lodged / planHealth.totalPlans) * 100) : 0}%`,
                backgroundColor: SURFBOARD_COLORS.success.main,
              }}
            />
          </div>

          <dl className="mt-4 divide-y divide-gray-100 dark:divide-white/10" style={{ minHeight: CHART_HEIGHT - 60 }}>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-gray-600 dark:text-gray-300">Queried, needs attention</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{planHealth.queried}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-gray-600 dark:text-gray-300">Awaiting MDA review</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{planHealth.underReview}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-gray-600 dark:text-gray-300">QR earnings this month</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">
                ₦{planHealth.qrEarningsThisMonth.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Row 2: Monthly Uploads | Records by Area | Pending Certificates */}
        <BarChart
          title="Monthly Uploads"
          subtitle="Number of plans uploaded per month"
          data={analytics.timeTrends.map(item => ({
            label: item.period,
            value: item.count,
          }))}
          height={CHART_HEIGHT}
          maxItems={12}
        />

        {/* Area distribution — one chart, switchable between LGA / LCDA / Ward instead of three parallel copies */}
        <BarChart
          title={`Records by ${AREA_DIMENSIONS.find(d => d.id === areaDimension)!.label}`}
          subtitle={`${areaCountByDimension[areaDimension]} unique ${AREA_DIMENSIONS.find(d => d.id === areaDimension)!.label}${areaCountByDimension[areaDimension] === 1 ? '' : 's'} · toggle to compare`}
          data={areaDataByDimension[areaDimension]}
          height={CHART_HEIGHT}
          maxItems={8}
          actions={
            <div className="inline-flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-white/5">
              {AREA_DIMENSIONS.map((dim) => (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => setAreaDimension(dim.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    areaDimension === dim.id
                      ? 'bg-white text-[#1D4ED8] shadow-sm dark:bg-white/10 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {dim.label}
                </button>
              ))}
            </div>
          }
        />

        {/* Pending Certificates — each row links straight to that plan's detail page */}
        <div className="bg-white rounded-lg shadow p-6 dark:bg-white/3 dark:shadow-none dark:border dark:border-white/10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pending Certificates</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Recently updated, awaiting approval</p>

          <div className="mt-4 -mx-2 overflow-y-auto" style={{ maxHeight: CHART_HEIGHT - 60 }}>
            {analytics.pendingCertificates.length > 0 ? (
              <ul className="space-y-1">
                {analytics.pendingCertificates.map((cert) => (
                  <li key={cert.id}>
                    <Link
                      href={`/surfboard/dashboard/plan?planId=${cert.id}`}
                      className="block rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {cert.planNumber}
                        </p>
                        <p className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(cert.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {cert.surveyTitle} · {cert.facilitator}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">No pending certificates</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
