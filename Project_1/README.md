# Insurance Claim Denial Prediction

## Overview

This project implements a machine learning pipeline to predict insurance claim denials using structured data. It includes data preprocessing, model training, evaluation, and real-time prediction—all encapsulated in a reusable Python class.

## Features

- Handles missing values and categorical encoding
- Strategy for imbalanced data using SMOTE
- Trains and evaluates 7 classification models
- Saves trained models for later use
- Supports exploratory data analysis (EDA)
- Provides real-time prediction on new data

## Models Trained

Seven models are trained and compared:

- Logistic Regression  
- Random Forest  
- Gradient Boosting  
- Support Vector Machine (SVM)  
- Neural Network (MLPClassifier)  
- K-Nearest Neighbors (KNN)  
- Naive Bayes  

Each model is evaluated on:
- Accuracy  
- Precision  
- Recall  
- F1 Score  
- ROC-AUC  
- Confusion Matrix  

## Handling Imbalanced Data

SMOTE (Synthetic Minority Over-sampling Technique) is applied during training to balance the dataset, improving model performance on underrepresented classes.

## Pipeline

Implemented through the `Insurance` class, which includes:

| Method                    | Description                             |
|---------------------------|-----------------------------------------|
| `__init__()`              | Loads data and sets up models           |
| `clean_data()`            | Preprocesses for training/inference     |
| `eda(column)`             | Performs EDA on a specified column      |
| `train()`                 | Trains and evaluates all models         |
| `predict(model, file)`    | Loads model and predicts on new data    |
| `generate_validation_csv()` | Creates sample input for testing       |

## How to Use

```python
insurance = Insurance("claims.csv")
insurance.eda("Insurance Company")
insurance.train()
insurance.predict("Random Forest", "validation.csv")
```

## Dependencies

- pandas  
- numpy  
- scikit-learn  
- imbalanced-learn  
- seaborn  
- matplotlib  
- joblib  

Install dependancies with:

```bash
pip install -r requirements.txt
```
