import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import SideMenu from '../components/SideMenu';
import PhotoUploaderF from '../components/PhotoUploaderFunctional';

import ResultsTable from '../components/ResultTable';
import {MOCK_RESULT} from '../components/mockData'
import WorkerPage from './WorkerScreen';
import SettingsPage from './SettingsScreen';
import { useTheme } from '../contexts/ThemeContext';


export default function DashboardScreen({route,  session, setSession}) {
    const user = session?.session?.username || 'User';
    const [activeTab, setActiveTab] = useState('upload');
    const [results, setResults] = useState([]);
    const { theme } = useTheme();
    useEffect(()=>{
        setResults(MOCK_RESULT);

    },[])

    console.log('📦 Dashboard results:', results);

    return (
        <View style={[styles.container,{ backgroundColor: theme.background }]}>
            <SideMenu user={user} onNavigate={(tab) => setActiveTab(tab)} activeTab={activeTab} setSession={setSession} session={{session}} />
            <View style={styles.content}>
                {activeTab === 'upload' && <PhotoUploaderF onBatchResults={(batchResults) => setResults((p) => [...batchResults, ...p])} />}
                {activeTab === 'results' && <ResultsTable data={results} />}
                {activeTab === 'workers' && <WorkerPage />}
                {activeTab === 'settings' && <SettingsPage/>}
                {activeTab === 'placeholder' && (
                    <View style={styles.placeholder}><Text>Placeholder Dashboard Page</Text></View>
                )}
            </View>
            
        </View>
    );
}


const styles = StyleSheet.create({
    container: {flex: 1, flexDirection: 'row',minHeight:'100vh'},
    content: {flex: 1, padding: 12, minHeight: '100vh'},
    placeholder: {flex: 1, justifyContent: 'center', alignItems: 'center'}
});