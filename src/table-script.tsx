import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { useMemo } from "react";
import sourceData from "./source-data.json";
import type { SourceDataType, TableDataType } from "./types";

const getCurrentMonthData = () => {
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthName = prevMonth.toLocaleString('default', { month: 'long' });
  const prevMonthYear = prevMonth.getFullYear();
  
  return {
    currentMonth,
    currentYear,
    prevMonthName,
    prevMonthYear,
    prevMonthKey: `${prevMonthYear}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  };
};

const tableData: TableDataType[] = (
  sourceData as unknown as SourceDataType[]
).reduce((acc, dataRow) => {
  const { currentMonth, prevMonthName, prevMonthKey } = getCurrentMonthData();
  const person = dataRow?.employees || dataRow?.externals;
  
  if (!person || person.status !== 'active') return acc;

  // Get utilization rates
  const utilization = person.workforceUtilisation;
  const lastThreeMonths = utilization?.lastThreeMonthsIndividually || [];
  
  // Find current and previous month utilization
  const currentMonthUtil = lastThreeMonths.find(m => m.month === currentMonth)?.utilisationRate || '0';
  const prevMonthUtil = lastThreeMonths.find(m => m.month === prevMonthName)?.utilisationRate || '0';
  
  // Calculate net earnings for previous month
  let netEarnings = '0 EUR';
  
  if (dataRow.employees) {
    // For employees, get from costsByMonth
    const costs = dataRow.employees.costsByMonth?.potentialEarningsByMonth?.find(
      m => m.month === prevMonthKey
    )?.costs;
    
    if (costs) {
      netEarnings = `${Math.round(parseFloat(costs))} EUR`;
    } else if (dataRow.employees.statusAggregation?.monthlySalary) {
      // Fallback to monthly salary if no costs data
      netEarnings = `${dataRow.employees.statusAggregation.monthlySalary} EUR`;
    }
  } else if (dataRow.externals) {
    // For externals, calculate based on hourly rate and utilization
    const hourlyRate = dataRow.externals.hourlyRateForProjects;
    if (hourlyRate && utilization) {
      // Assuming 160 working hours/month (40h/week * 4 weeks)
      const hoursWorked = 160 * parseFloat(prevMonthUtil || '0');
      const earnings = hoursWorked * parseFloat(hourlyRate);
      netEarnings = `${Math.round(earnings)} EUR`;
    }
  }

  const row: TableDataType = {
    person: person.name,
    past12Months: utilization?.utilisationRateLastTwelveMonths 
      ? `${Math.round(parseFloat(utilization.utilisationRateLastTwelveMonths) * 100)}%` 
      : '0%',
    y2d: utilization?.utilisationRateYearToDate 
      ? `${Math.round(parseFloat(utilization.utilisationRateYearToDate) * 100)}%` 
      : '0%',
    may: (() => {
      const mayData = lastThreeMonths.find(m => m.month === 'May');
      return mayData
        ? `${Math.round(parseFloat(mayData.utilisationRate) * 100)}%`
        : '...';
      })(),

    june: lastThreeMonths.find(m => m.month === 'June')?.utilisationRate 
      ? `${Math.round(parseFloat(lastThreeMonths.find(m => m.month === 'June')!.utilisationRate) * 100)}%` 
      : '0%',
    july: lastThreeMonths.find(m => m.month === 'July')?.utilisationRate 
      ? `${Math.round(parseFloat(lastThreeMonths.find(m => m.month === 'July')!.utilisationRate) * 100)}%` 
      : '0%',
    netEarningsPrevMonth: netEarnings,
  };

  return [...acc, row];
}, [] as TableDataType[]);

const Example = () => {
  const columns = useMemo<MRT_ColumnDef<TableDataType>[]>(
    () => [
      {
        accessorKey: "person",
        header: "Person",
      },
      {
        accessorKey: "past12Months",
        header: "Past 12 Months",
      },
      {
        accessorKey: "y2d",
        header: "Y2D",
      },
      {
        accessorKey: "may",
        header: "May",
      },
      {
        accessorKey: "june",
        header: "June",
      },
      {
        accessorKey: "july",
        header: "July",
      },
      {
        accessorKey: "netEarningsPrevMonth",
        header: "Net Earnings Prev Month",
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData,
  });

  return <MaterialReactTable table={table} />;
};

export default Example;