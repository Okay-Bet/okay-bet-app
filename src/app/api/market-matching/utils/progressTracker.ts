export interface ProgressUpdate {
    stage: string;
    message: string;
    data?: any;
    timestamp: string;
}

export class ProgressTracker {
    updates: ProgressUpdate[] = [];

    addUpdate(stage: string, message: string, data?: any) {
        const update = {
            stage,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
        this.updates.push(update);
        console.log(`[${stage}] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
        return update;
    }

    getUpdates() {
        return this.updates;
    }
}