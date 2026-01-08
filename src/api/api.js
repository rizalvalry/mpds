import { getSession } from "./Auth";

export async function getWorker(){
    try{
        const session = await getSession();
        const token = session.session.session_token;
        const response = await fetch('https://droneark.bsi.co.id/api/users/user/getworker',{
            method: "GET",
            headers:
                {
                    "Content-Type": "application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        )

        const data = await response.json();
        if(data.status !== 200){
            throw new Error("failed to fecth worker");
        }

        return data;
    }catch (error){
        console.log("can't fetch worker, ",error);
    }
}

export async function createUser(){
    try{

    }catch{

    }
}

export async function editUser(){
    try{

    }catch{

    }
}

export async function deleteUser(){
    try{

    }catch{

    }
}

// ====================================================================
// DETECTION TIMELINE API CALLS
// ====================================================================

/**
 * Mark detection started (called BEFORE upload starts)
 * @param {string} operator - Drone identifier (e.g., "Drone-001")
 * @param {string} areaCode - Area block code (e.g., "C")
 * @returns {Promise<boolean>} - Success status
 */
export async function markDetectionStarted(operator, areaCode) {
    try {
        const session = await getSession();
        const token = session.session.session_token;

        const response = await fetch('https://droneark.bsi.co.id/services/cases/api/UploadDetails/detection', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                operator: operator,
                areaCode: areaCode,
                detectionStartedAt: new Date().toISOString(),
                totalDetected: 0,
                totalUndetected: 0
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to mark detection started');
        }

        console.log('[API] ✅ Detection started tracked:', operator, 'Block', areaCode);
        return true;

    } catch (error) {
        console.error('[API] ⚠️ Failed to mark detection start:', error);
        // Non-critical: Continue with upload even if API fails
        return false;
    }
}

/**
 * Mark detection completed (called AFTER all files processed)
 * @param {string} operator - Drone identifier
 * @param {string} areaCode - Area block code
 * @param {number} totalDetected - Total images with bird drops
 * @param {number} totalUndetected - Total images without bird drops
 * @returns {Promise<boolean>} - Success status
 */
export async function markDetectionCompleted(operator, areaCode, totalDetected, totalUndetected) {
    try {
        const session = await getSession();
        const token = session.session.session_token;

        const response = await fetch('https://droneark.bsi.co.id/services/cases/api/UploadDetails/detection', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                operator: operator,
                areaCode: areaCode,
                detectionCompletedAt: new Date().toISOString(),
                totalDetected: totalDetected,
                totalUndetected: totalUndetected
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to mark detection completed');
        }

        console.log('[API] ✅ Detection completed tracked:', operator, 'Block', areaCode);
        console.log('[API] Total detected:', totalDetected, '| Total undetected:', totalUndetected);
        return true;

    } catch (error) {
        console.error('[API] ⚠️ Failed to mark detection completion:', error);
        // Non-critical: Detection will not be tracked but files are processed
        return false;
    }
}

