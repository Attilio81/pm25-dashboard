import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';
import { Info } from 'lucide-react';
import Papa from 'papaparse';
import _ from 'lodash';

// Componenti semplificati
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="flex flex-col space-y-1.5 p-6">
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h3 className="text-2xl font-semibold leading-none tracking-tight">
    {children}
  </h3>
);

const CardContent = ({ children }) => (
  <div className="p-6 pt-0">
    {children}
  </div>
);

const Alert = ({ children }) => (
  <div className="relative w-full rounded-lg border p-4 bg-blue-50 border-blue-200 mb-4">
    {children}
  </div>
);

const PM25Dashboard = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  
  const getMonthName = (monthNum) => {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                   'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[parseInt(monthNum) - 1];
  };

  const getMonthShortName = (monthNum) => {
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                   'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return months[parseInt(monthNum) - 1];
  };

  const getMonthYear = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    return `${month}/${year}`;
  };
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/Torino-Rebaudengo_Polveri-sottili_2023-11-08_2024-11-07.csv');
        const text = await response.text();
        
        const parsedData = Papa.parse(text, {
          delimiter: ";",
          header: true,
          skipEmptyLines: true,
          transformHeader: header => header.trim(),
          transform: value => value.trim()
        });
        
        const processedData = parsedData.data
          .map(row => ({
            date: row['Data rilevamento'],
            value: row['Valore'] === '' ? null : parseFloat(row['Valore'])
          }))
          .filter(row => row.value !== null);
        
        // Statistiche generali
        const validValues = processedData.filter(d => d.value !== null);
        const stats = {
          count: validValues.length,
          min: Math.min(...validValues.map(d => d.value)),
          max: Math.max(...validValues.map(d => d.value)),
          avg: validValues.reduce((acc, curr) => acc + curr.value, 0) / validValues.length,
          exceedances: validValues.filter(d => d.value > 25).length
        };

        // Statistiche mensili
        const monthlyData = parsedData.data.reduce((acc, row) => {
          const monthYear = getMonthYear(row['Data rilevamento']);
          const value = row['Valore'] === '' ? null : parseFloat(row['Valore']);
          
          if (!acc[monthYear]) {
            acc[monthYear] = {
              monthYear,
              totalDays: 0,
              exceedances: 0,
              avgValue: 0,
              validValues: []
            };
          }
          
          if (value !== null) {
            acc[monthYear].totalDays++;
            if (value > 25) {
              acc[monthYear].exceedances++;
            }
            acc[monthYear].validValues.push(value);
          }
          
          return acc;
        }, {});

        // Calcoliamo le medie e percentuali per ogni mese
        const monthlyStats = Object.values(monthlyData).map(month => {
          const values = month.validValues;
          const [monthNum, year] = month.monthYear.split('/');
          return {
            ...month,
            monthShort: `${getMonthShortName(monthNum)} ${year}`,
            avgValue: values.reduce((a, b) => a + b, 0) / values.length,
            exceedancePercentage: (month.exceedances / month.totalDays * 100).toFixed(1)
          };
        }).sort((a, b) => {
          const [monthA, yearA] = a.monthYear.split('/');
          const [monthB, yearB] = b.monthYear.split('/');
          return yearA === yearB ? monthA - monthB : yearA - yearB;
        });
        
        setData(processedData);
        setStats(stats);
        setMonthlyStats(monthlyStats);
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
      }
    };
    
    loadData();
  }, []);

  if (!stats) {
    return <div className="p-4">Caricamento dati in corso...</div>;
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Monitoraggio PM2.5 - Torino Rebaudengo</h1>
      
      <Alert>
        <div className="flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 text-blue-500" />
          <div>
            <h5 className="font-semibold mb-1">Informazioni sulla stazione</h5>
            <p className="text-sm">
              Dati rilevati dalla stazione di monitoraggio Torino - Rebaudengo. 
              Il PM2.5 rappresenta il particolato fine con diametro inferiore a 2.5 micrometri.
              La soglia di attenzione è fissata a 25 µg/m³.
            </p>
          </div>
        </div>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Media Periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg.toFixed(1)} µg/m³</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Valore Massimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.max} µg/m³</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Superamenti Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exceedances} giorni</div>
            <div className="text-sm text-gray-500">sopra 25 µg/m³</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Andamento PM2.5</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'µg/m³', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <ReferenceLine y={25} stroke="red" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="value" stroke="#2563eb" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Analisi Mensile dei Superamenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Mese</th>
                    <th className="text-right p-2">Media</th>
                    <th className="text-right p-2">Giorni Totali</th>
                    <th className="text-right p-2">Giorni Sopra Soglia</th>
                    <th className="text-right p-2">% Superamenti</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map((month, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{getMonthName(month.monthYear.split('/')[0])} {month.monthYear.split('/')[1]}</td>
                      <td className="text-right p-2">{month.avgValue.toFixed(1)} µg/m³</td>
                      <td className="text-right p-2">{month.totalDays}</td>
                      <td className="text-right p-2">{month.exceedances}</td>
                      <td className="text-right p-2">{month.exceedancePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Istogramma Superamenti Mensili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={monthlyStats}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="monthShort"
                    angle={-45}
                    interval={0}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="exceedances" name="Superamenti" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-sm text-gray-500 mt-4">
        Dati aggiornati al: {data[data.length - 1]?.date}
      </div>
    </div>
  );
};

export default PM25Dashboard;