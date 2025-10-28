"""
PyTorch Model Architectures for Biogas Analytics
Deep learning models for forecasting, anomaly detection, and pattern recognition
"""
import torch
import torch.nn as nn


class LSTMForecaster(nn.Module):
    """
    LSTM-based forecaster for gas production prediction
    Predicts CH4%, CO2%, flow rate, and energy production 1-24 hours ahead
    """
    def __init__(self, input_size=95, hidden_size=256, num_layers=3, output_size=4, forecast_horizon=24):
        super(LSTMForecaster, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.forecast_horizon = forecast_horizon
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0,
            bidirectional=False
        )
        
        # Attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.Tanh(),
            nn.Linear(hidden_size // 2, 1)
        )
        
        # Fully connected layers for prediction
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, output_size * forecast_horizon)
        )
    
    def forward(self, x):
        """
        Forward pass
        Args:
            x: Input tensor (batch, sequence_length, input_size)
        Returns:
            predictions: (batch, forecast_horizon, output_size)
        """
        # LSTM forward
        lstm_out, (hidden, cell) = self.lstm(x)
        
        # Apply attention
        attention_weights = torch.softmax(self.attention(lstm_out), dim=1)
        context = torch.sum(attention_weights * lstm_out, dim=1)
        
        # Predictions
        predictions = self.fc(context)
        
        # Reshape to (batch, forecast_horizon, output_size)
        batch_size = x.size(0)
        predictions = predictions.view(batch_size, self.forecast_horizon, -1)
        
        return predictions


class Autoencoder(nn.Module):
    """
    Autoencoder for anomaly detection
    Learns normal operation patterns and detects anomalies via reconstruction error
    """
    def __init__(self, input_size=95, encoding_dim=32):
        super(Autoencoder, self).__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(0.2),
            
            nn.Linear(64, 48),
            nn.ReLU(),
            nn.BatchNorm1d(48),
            nn.Dropout(0.2),
            
            nn.Linear(48, encoding_dim),
            nn.ReLU()
        )
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 48),
            nn.ReLU(),
            nn.BatchNorm1d(48),
            nn.Dropout(0.2),
            
            nn.Linear(48, 64),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(0.2),
            
            nn.Linear(64, input_size)
        )
    
    def forward(self, x):
        """Forward pass"""
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded
    
    def encode(self, x):
        """Get encoded representation"""
        return self.encoder(x)
    
    def get_reconstruction_error(self, x):
        """Calculate reconstruction error for anomaly detection"""
        with torch.no_grad():
            reconstructed = self.forward(x)
            error = torch.mean((x - reconstructed) ** 2, dim=1)
        return error


class CNNLSTMHybrid(nn.Module):
    """
    CNN-LSTM Hybrid for pattern recognition
    Uses CNN to extract spatial features, LSTM for temporal patterns
    """
    def __init__(self, input_size=95, sequence_length=60, num_classes=5):
        super(CNNLSTMHybrid, self).__init__()
        
        self.sequence_length = sequence_length
        
        # 1D CNN for feature extraction
        self.conv1 = nn.Sequential(
            nn.Conv1d(in_channels=input_size, out_channels=64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.MaxPool1d(kernel_size=2)
        )
        
        self.conv2 = nn.Sequential(
            nn.Conv1d(in_channels=64, out_channels=128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.MaxPool1d(kernel_size=2)
        )
        
        self.conv3 = nn.Sequential(
            nn.Conv1d(in_channels=128, out_channels=256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.MaxPool1d(kernel_size=2)
        )
        
        # Calculate LSTM input size after convolutions
        reduced_length = sequence_length // 8  # After 3 pooling layers
        
        # LSTM for temporal patterns
        self.lstm = nn.LSTM(
            input_size=256,
            hidden_size=128,
            num_layers=2,
            batch_first=True,
            dropout=0.2,
            bidirectional=True
        )
        
        # Fully connected classifier
        self.fc = nn.Sequential(
            nn.Linear(128 * 2, 64),  # *2 for bidirectional
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )
    
    def forward(self, x):
        """
        Forward pass
        Args:
            x: Input tensor (batch, sequence_length, input_size)
        Returns:
            class_logits: (batch, num_classes)
        """
        # Reshape for CNN: (batch, input_size, sequence_length)
        x = x.permute(0, 2, 1)
        
        # CNN feature extraction
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        
        # Reshape for LSTM: (batch, reduced_length, 256)
        x = x.permute(0, 2, 1)
        
        # LSTM temporal modeling
        lstm_out, (hidden, cell) = self.lstm(x)
        
        # Use last hidden state
        last_hidden = lstm_out[:, -1, :]
        
        # Classification
        logits = self.fc(last_hidden)
        
        return logits


class VariationalAutoencoder(nn.Module):
    """
    Variational Autoencoder (VAE) for advanced anomaly detection
    Learns probabilistic latent representations
    """
    def __init__(self, input_size=95, latent_dim=16):
        super(VariationalAutoencoder, self).__init__()
        
        self.latent_dim = latent_dim
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(0.2),
            
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.BatchNorm1d(32)
        )
        
        # Latent space
        self.fc_mu = nn.Linear(32, latent_dim)
        self.fc_logvar = nn.Linear(32, latent_dim)
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.ReLU(),
            nn.BatchNorm1d(32),
            nn.Dropout(0.2),
            
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(0.2),
            
            nn.Linear(64, input_size)
        )
    
    def encode(self, x):
        """Encode input to latent distribution parameters"""
        h = self.encoder(x)
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar
    
    def reparameterize(self, mu, logvar):
        """Reparameterization trick"""
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
    
    def decode(self, z):
        """Decode latent representation"""
        return self.decoder(z)
    
    def forward(self, x):
        """Forward pass"""
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        reconstructed = self.decode(z)
        return reconstructed, mu, logvar
    
    def get_anomaly_score(self, x):
        """Calculate anomaly score"""
        with torch.no_grad():
            reconstructed, mu, logvar = self.forward(x)
            reconstruction_error = torch.mean((x - reconstructed) ** 2, dim=1)
            kl_divergence = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp(), dim=1)
            anomaly_score = reconstruction_error + 0.1 * kl_divergence
        return anomaly_score


def get_model(model_name, **kwargs):
    """
    Factory function to get model by name
    
    Args:
        model_name: 'lstm_forecaster', 'autoencoder', 'cnn_lstm', 'vae'
        **kwargs: Model-specific parameters
    
    Returns:
        Model instance
    """
    models = {
        'lstm_forecaster': LSTMForecaster,
        'autoencoder': Autoencoder,
        'cnn_lstm': CNNLSTMHybrid,
        'vae': VariationalAutoencoder
    }
    
    if model_name not in models:
        raise ValueError(f"Unknown model: {model_name}. Choose from {list(models.keys())}")
    
    return models[model_name](**kwargs)


def count_parameters(model):
    """Count trainable parameters in model"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    # Test model creation
    print("Testing Biogas Analytics Model Architectures...\n")
    
    # LSTM Forecaster
    lstm_model = LSTMForecaster(input_size=95, hidden_size=256, num_layers=3, output_size=4, forecast_horizon=24)
    print(f"LSTM Forecaster: {count_parameters(lstm_model):,} parameters")
    test_input = torch.randn(8, 24, 95)  # batch=8, sequence=24 hours, features=95
    output = lstm_model(test_input)
    print(f"  Input: {test_input.shape}, Output: {output.shape}\n")
    
    # Autoencoder
    ae_model = Autoencoder(input_size=95, encoding_dim=32)
    print(f"Autoencoder: {count_parameters(ae_model):,} parameters")
    test_input = torch.randn(8, 95)
    output = ae_model(test_input)
    print(f"  Input: {test_input.shape}, Output: {output.shape}\n")
    
    # CNN-LSTM Hybrid
    cnn_lstm_model = CNNLSTMHybrid(input_size=95, sequence_length=60, num_classes=5)
    print(f"CNN-LSTM Hybrid: {count_parameters(cnn_lstm_model):,} parameters")
    test_input = torch.randn(8, 60, 95)  # batch=8, sequence=60 minutes, features=95
    output = cnn_lstm_model(test_input)
    print(f"  Input: {test_input.shape}, Output: {output.shape}\n")
    
    # VAE
    vae_model = VariationalAutoencoder(input_size=95, latent_dim=16)
    print(f"Variational Autoencoder: {count_parameters(vae_model):,} parameters")
    test_input = torch.randn(8, 95)
    output, mu, logvar = vae_model(test_input)
    print(f"  Input: {test_input.shape}, Output: {output.shape}, Latent: {mu.shape}\n")
    
    print("✓ All models created successfully!")
