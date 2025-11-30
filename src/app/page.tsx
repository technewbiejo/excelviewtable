'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { DataTable } from '@/components/data-table';
import { parseCsv, type CsvRow } from '@/lib/csv-parser';
import { suggestFilters } from '@/ai/flows/ai-suggested-filters';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

type AppState = 'upload' | 'loading' | 'error' | 'display';

export default function Home() {
    const [appState, setAppState] = useState<AppState>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<CsvRow[]>([]);
    const [suggestedFiltersState, setSuggestedFiltersState] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [error, setError] = useState<string>('');

    const { toast } = useToast();

    const handleDataLoaded = async (file: File) => {
        try {
            setAppState('loading');
            setFileName(file.name);

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const fileContent = e.target?.result;
                    let parsedHeaders: string[] = [];
                    let parsedData: CsvRow[] = [];
                    let csvForAi: string = '';

                    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                        const csvString = fileContent as string;
                        const result = parseCsv(csvString);
                        parsedHeaders = result.headers;
                        parsedData = result.data;
                        csvForAi = csvString;
                    } else {
                        const workbook = XLSX.read(fileContent, { type: 'binary' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];

                        // Convert to array of arrays, but remove empty cells at the end of rows
                        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

                        // Find the start of the table
                        let startRowIndex = -1;
                        let maxNonEmptyCells = 0;
                        let headerRowIndex = -1;

                        jsonData.forEach((row, rowIndex) => {
                            const nonEmptyCellCount = row.filter(cell => cell !== null && String(cell).trim() !== '').length;

                            // A potential header row should have at least 2 cells and more than the previous max
                            if (nonEmptyCellCount > 1 && nonEmptyCellCount > maxNonEmptyCells) {
                                // Check if the next row has a similar number of non-empty cells, indicating it's likely data
                                const nextRow = jsonData[rowIndex + 1];
                                if(nextRow){
                                    const nextRowNonEmptyCount = nextRow.filter(cell => cell !== null && String(cell).trim() !== '').length;
                                    // If the current row and the next have a similar number of columns, it's a good sign
                                    if (Math.abs(nonEmptyCellCount - nextRowNonEmptyCount) <= 2) {
                                        maxNonEmptyCells = nonEmptyCellCount;
                                        headerRowIndex = rowIndex;
                                    }
                                }
                            }
                        });

                        if (headerRowIndex === -1) {
                            // Fallback for single-row headers or other edge cases
                            jsonData.forEach((row, rowIndex) => {
                                const nonEmptyCellCount = row.filter(cell => cell !== null && String(cell).trim() !== '').length;
                                if (nonEmptyCellCount > maxNonEmptyCells) {
                                    maxNonEmptyCells = nonEmptyCellCount;
                                    headerRowIndex = rowIndex;
                                }
                            });
                        }

                        if (headerRowIndex === -1) {
                            throw new Error('Could not automatically identify the header row in the Excel file. Please ensure it is formatted as a standard table.');
                        }

                        startRowIndex = headerRowIndex + 1;

                        parsedHeaders = jsonData[headerRowIndex].filter(h => h !== null).map(String);

                        const rawData = jsonData.slice(startRowIndex);

                        parsedData = rawData.map((row: any[]) => {
                            const rowData: CsvRow = {};
                            parsedHeaders.forEach((header, index) => {
                                rowData[header] = String(row[index] ?? '');
                            });
                            return rowData;
                        }).filter(row => Object.values(row).some(val => val.trim() !== ''));


                        // For AI analysis, convert the detected table data to a CSV string
                        csvForAi = [parsedHeaders.join(','), ...parsedData.map(row => parsedHeaders.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
                    }


                    if (parsedHeaders.length === 0 || parsedData.length === 0) {
                        throw new Error('File is empty or no data could be parsed. Please check the file format.');
                    }

                    setHeaders(parsedHeaders);
                    setData(parsedData);

                    toast({
                        title: 'File Parsed Successfully',
                        description: 'Analyzing data for filter suggestions...',
                    });

                    const aiSuggestions = await suggestFilters({ csvData: csvForAi });
                    setSuggestedFiltersState(aiSuggestions.suggestedFilters);

                    toast({
                        title: 'AI Analysis Complete',
                        description: 'Suggested filters are now available.',
                    });

                    setAppState('display');
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during file processing.';
                    setError(errorMessage);
                    setAppState('error');
                    toast({
                        variant: 'destructive',
                        title: 'Error Processing File',
                        description: errorMessage,
                    });
                }
            };
            reader.onerror = () => {
                const errorMsg = 'Could not read the selected file.';
                setError(errorMsg);
                setAppState('error');
                toast({
                    variant: 'destructive',
                    title: 'File read error',
                    description: errorMsg,
                });
            };

            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsBinaryString(file);
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            setAppState('error');
            toast({
                variant: 'destructive',
                title: 'Error Processing File',
                description: errorMessage,
            });
        }
    };

    const handleReset = () => {
        setAppState('upload');
        setHeaders([]);
        setData([]);
        setSuggestedFiltersState([]);
        setFileName('');
        setError('');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
            const isXlsx = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx');

            if (!isCsv && !isXlsx) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid file type',
                    description: 'Please upload a .csv or .xlsx file.',
                });
                return;
            }
            handleDataLoaded(file);
        }
    };

    const CsvUploadComponent = () => (
        <div className="flex flex-col items-center justify-center p-4 sm:p-8">
            <Card className="w-full max-w-lg shadow-lg animation-fade-in-up">
                <CardHeader>
                    <CardTitle className="font-headline text-3xl text-center">Visualize Your Data</CardTitle>
                    <CardDescription className="text-center pt-2">
                        Upload a CSV or XLSX file to instantly generate an interactive table and gain AI-powered insights.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center space-y-4">
                        <label
                            htmlFor="csv-upload"
                            className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-accent-foreground">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">CSV or XLSX files only</p>
                            </div>
                            <Input
                                id="csv-upload"
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                onChange={handleFileChange}
                            />
                        </label>
                        <Button onClick={() => document.getElementById('csv-upload')?.click()}>Select File</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const LoadingComponent = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-16 w-full" />
            <div className="rounded-lg border">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );

    const ErrorComponent = () => (
        <div className="flex flex-col items-center justify-center p-4 sm:p-8 gap-4">
            <Alert variant="destructive" className="max-w-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Processing Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleReset}>Try Again</Button>
        </div>
    );

    const renderContent = () => {
        switch (appState) {
            case 'upload':
                return <CsvUploadComponent />;
            case 'loading':
                return <LoadingComponent />;
            case 'display':
                return (
                    <DataTable
                        headers={headers}
                        data={data}
                        suggestedFilters={suggestedFiltersState}
                        fileName={fileName}
                        onReset={handleReset}
                    />
                );
            case 'error':
                return <ErrorComponent />;
            default:
                return <CsvUploadComponent />;
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">{renderContent()}</main>
            <footer className="py-4 px-4 text-center text-sm text-muted-foreground">
                Developed by Gemini
            </footer>
        </div>
    );
}
