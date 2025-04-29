# 🌍 Emissions Forecasting and Trend Analysis

This project focuses on analyzing and forecasting greenhouse gas emissions (N₂O, CH₄, CO₂eq) across various countries and regions. It leverages historical emissions data from agricultural and land-use activities to:

- Visualize long-term trends and change points
- Detect seasonality
- Forecast future emissions using multiple time series and machine learning models
- Compare emissions efficiency between countries

---

## 📁 Project Structure

- **Notebook**: Contains all the data analysis, visualization, and forecasting logic.
- **requirements.txt**: Lists Python dependencies for running the notebook.
- **Data File**: `Emissions_Totals_E_All_Data.csv` (FAO dataset)

---

## 🛠️ Features

- Trend decomposition and seasonality detection
- Change point detection using `ruptures`
- Forecasting using:
  - ARIMA / SARIMA
  - Exponential Smoothing (ETS)
  - LSTM
  - XGBoost
  - Random Forest
  - Hidden Markov Model (HMM)
- Country-level comparative analysis (e.g., Uganda vs. Benin)
- Region-specific analysis (e.g., Southern Africa, Non-Annex I countries)

---

## 🔧 Setup Instructions

1. **Clone this repository**

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Run the Notebook**

Make sure the CSV file `Emissions_Totals_E_All_Data.csv` is in the same directory as the notebook.

---

## 📊 Example Analyses

- N₂O emissions from synthetic fertilizer use in Bangladesh
- CH₄ and N₂O emissions from savanna fires in Southern Africa
- Relative emissions efficiency comparison (Uganda vs. Benin)
- Forecasts for countries with limited data (e.g., Sudan, Malawi)

---

## ⚠️ Notes

- Some countries or activities may lack sufficient data for accurate forecasting.
- Seasonal patterns are not modeled when data is annual.

---