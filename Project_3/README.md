# UNESCO World Heritage Site Clustering

## Overview

This project analyzes and clusters UNESCO World Heritage Sites based on their textual descriptions. By applying NLP and unsupervised learning, the model reveals thematic groupings among over 1,000 sites worldwide.

## Methodology

- **Data Extraction:** Parsed site data from an XML feed (`whc.unesco.org.xml`)
- **Text Cleaning:** Removed HTML, lemmatized, and filtered with custom stopwords
- **Embeddings:** Used `all-MiniLM-L6-v2` from SentenceTransformers for semantic encoding
- **Clustering:** KMeans with 3 clusters (optimal `k` chosen using the Elbow Method)
- **Visualization:** PCA projection for 2D cluster visualization
- **Interpretation:** Themes inferred using TF-IDF-based keyword analysis

## Identified Themes

| Cluster | Theme | Description | Sample Sites |
|--------:|-------|-------------|--------------|
| **0** | Historic Towns & Architecture | Focuses on European cities, churches, and classical architecture reflecting cultural and religious heritage | Aachen Cathedral, Abbey Church of Saint-Savin, Royal Palace at Caserta |
| **1** | Natural Landscapes & Biodiversity | Includes protected natural parks, forests, islands, and ecosystems rich in plant and animal life | Aldabra Atoll, Air and Ténéré Reserves, Aasivissuit – Nipisat |
| **2** | Ancient Civilizations & Archaeological Sites | Centers around ancient ruins, temples, and culturally significant archaeological remains | Agra Fort, Ajanta Caves, Aflaj Irrigation Systems of Oman |

## Output

- **Clustered Data:** Exported to `clusters.csv`
- **Visualizations:** Elbow plot for k-selection and PCA scatter plot of site clusters
- **Insights:** Summarized thematic groupings with representative examples

## Dependencies

```bash
pip install pandas numpy nltk scikit-learn sentence-transformers matplotlib
```