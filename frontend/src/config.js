/**
 * Application configuration and constants
 */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const APP_CONFIG = {
  name: "Kona",
  tagline: "Watch the best mini-series",
  welcomeBonus: 50,
  referralBonus: 30,
  dailyReward: 10,
  episodeCost: 5,
};

export default APP_CONFIG;
