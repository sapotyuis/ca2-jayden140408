// Backwards-compatible utility export. Quest progress is a user-quest model operation so the
// gameplay middleware can run it with the same transaction client as the other action steps.
export { advanceQuestProgress } from '../models/userQuestModel.js';
