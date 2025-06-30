import os
import logging
import pandas as pd
import json
import numpy as np
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

categorical_cols = ['Insurance Company', 'CPT4 - Procedure', 'Diag 1', 'Diag 2', 'Modality', 'Place Of Serv']


def init():
    """
    This function is called when the container is initialized/started, typically after create/update of the deployment.
    You can write the logic here to perform init operations like caching the model in memory
    """
    global model
    global feature_names
    # AZUREML_MODEL_DIR is an environment variable created during deployment.
    # It is the path to the model folder (./azureml-models/$MODEL_NAME/$VERSION)
    # Please provide your model's folder name if there is one
    model_path = os.path.join(
        os.getenv("AZUREML_MODEL_DIR"), "Random_Forest.pkl"
    )
    features_path = "./feature_names.pkl"
    # deserialize the model file back into a sklearn model
    model = joblib.load(model_path)
    feature_names = joblib.load(features_path)
    logging.info("Init complete")


def run(raw_data):
    """
    This function is called for every invocation of the endpoint to perform the actual scoring/prediction.
    In the example we extract the data from the json input and call the scikit-learn model's predict()
    method and return the result back
    """
    logging.info("model 1: request received")
    data = json.loads(raw_data)["data"]
    try:
        df = pd.DataFrame(data)
        # Validate required columns exist
        expected_cols = set(categorical_cols)
        if not expected_cols.issubset(df.columns):
            missing = expected_cols - set(df.columns)
            raise ValueError(f"Missing required columns: {missing}")

        # Minimal cleaning
        df['Diag 2'] = df['Diag 2'].replace("", np.nan).fillna("None").astype(str)
        df['Modality'] = df['Modality'].replace("", np.nan).fillna("Unknown").astype(str)
        
        cols_to_drop = [col for col in ['Mod 1', 'Mod 2'] if col in df.columns]
        df = df.drop(columns=cols_to_drop)

        # One-hot encoding
        df_encoded = pd.get_dummies(df, columns=categorical_cols)

        # Add missing features
        missing_cols = [col for col in feature_names if col not in df_encoded.columns]
        if missing_cols:
            missing_df = pd.DataFrame(0, index=df_encoded.index, columns=missing_cols)
            df_encoded = pd.concat([df_encoded, missing_df], axis=1)

        df_encoded = df_encoded[feature_names]

        X = df_encoded.drop(columns=["Denied"], errors="ignore").astype(float)
        preds = model.predict(X)
        result = {"predictions": np.where(preds == 1, "Accepted", "Denied").tolist()}
        return result

    except ValueError as ve:
        logger.warning(f"Validation error: {ve}")
    except Exception as e:
        logger.exception("Unexpected error during prediction.")