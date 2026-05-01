import yfinance as yf
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import requests
import os
import re

def get_valid_ticker(ticker):
    """Bypasses manual symbol entry by searching Yahoo Finance for the company ticker."""
    print(f"Searching for symbol for: {ticker}...")
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={ticker}&quotesCount=1"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if 'quotes' in data and len(data['quotes']) > 0:
            found_ticker = data['quotes'][0]['symbol']
            # Verify if it's valid
            if not yf.Ticker(found_ticker).history(period="1d").empty:
                print(f"Found symbol: {found_ticker}")
                return found_ticker
    except Exception as e:
        print(f"Search error: {e}")

    # Fallback to original cleanup if search fails
    return ticker.upper().strip().replace(" ", "-")

def predict_stock(ticker):
    # 1. Get company information
    company_name = ticker
    industry = "Unknown Industry"
    sector = "Unknown Sector"
    current_price = "Unknown"
    
    try:
        ticker_obj = yf.Ticker(ticker)
        info = ticker_obj.info
        company_name = info.get('longName', ticker)
        industry = info.get('industry', 'Unknown Industry')
        sector = info.get('sector', 'Unknown Sector')
        current_price = info.get('currentPrice', info.get('previousClose', 'Unknown'))
    except Exception:
        pass

    # 2. Download historical data
    data = yf.download(ticker, period="5y", interval="1d", progress=False)
    
    if data.empty:
        return None
    
    # 3. Feature Engineering: Use previous day's Close to predict current Close
    data['Target'] = data['Close']
    data['Prev_Close'] = data['Close'].shift(1)
    data = data.dropna()

    X = data[['Prev_Close']]
    y = data['Target']

    # 4. Split and Train
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Calculate R-squared accuracy on the test set
    accuracy = model.score(X_test, y_test) * 100

    # 5. Predict next day
    last_price = data['Close'].iloc[-1:].values.reshape(-1, 1)
    prediction = model.predict(last_price)
    
    return {
        'prediction': prediction[0],
        'accuracy': accuracy,
        'company_name': company_name,
        'industry': industry,
        'sector': sector,
        'current_price': current_price,
        'last_price_used': last_price[0][0]
    }

def chat():
    print("AI: Hello! I am your Stock Prediction AI. You can ask me to predict a stock's price, or just say hi.")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("AI: For a human-like experience, you can use a FREE Google Gemini API key.")
        print("AI: Get one for free at: https://aistudio.google.com/app/apikey")
        api_key = input("AI: Enter your GEMINI_API_KEY (or simply press Enter to run the free basic version): ").strip()
        if api_key:
            os.environ["GEMINI_API_KEY"] = api_key

    chat_session = None
    if os.environ.get("GEMINI_API_KEY"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction="You are a friendly, highly intelligent stock prediction AI chatbot. You converse with the user in a human-like, engaging, and empathetic way. Your main purpose is predicting stocks. When provided with stock prediction data in system notes, explain the prediction, the stock's information, and your accuracy percentage gracefully and conversationally.")
            chat_session = model.start_chat(history=[])
            print("AI: Human-like AI module (Gemini) loaded successfully.")
        except ImportError:
            print("AI: The 'google-generativeai' package is not installed. Using standard bot responses.")
            print("AI: You can install it later by running: pip install google-generativeai")
    
    last_accuracy = None
    last_ticker = None
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (KeyboardInterrupt, EOFError):
            break
            
        if not user_input:
            continue
            
        user_lower = user_input.lower()
        
        if user_lower in ['quit', 'exit', 'bye', 'goodbye']:
            if chat_session:
                try:
                    response = chat_session.send_message(user_input)
                    print(f"AI: {response.text}")
                except Exception:
                    print("AI: Goodbye! Happy trading!")
            else:
                print("AI: Goodbye! Happy trading!")
            break
            
        stock_context = ""
        # Check for prediction intent
        if 'predict' in user_lower or 'price' in user_lower or 'stock' in user_lower or 'forecast' in user_lower:
            match = re.search(r'(?:predict|price of|for|stock)\s+([a-zA-Z0-9.\-\s]+)', user_lower)
            company = None
            
            if match:
                potential_company = match.group(1).replace("stock", "").replace("price", "").replace("please", "").strip()
                if potential_company and len(potential_company) > 1:
                    company = potential_company
                    
            if company:
                print(f"AI: Let me look into '{company}' for you...")
                ticker = get_valid_ticker(company)
                if ticker:
                    result = predict_stock(ticker)
                    if result is not None:
                        last_accuracy = result['accuracy']
                        last_ticker = ticker
                        stock_context = f"[SYSTEM NOTE TO AI: The user asked about {company}. You just ran your Random Forest model on 5 years of historical data for {ticker} ({result['company_name']}, {result['sector']} / {result['industry']}). The current price is ${result['current_price']}. You predict the next closing price will be ${result['prediction']:.2f}. The R-squared test accuracy of your model is {result['accuracy']:.2f}%. Please explain this forecast and the company context to the user conversationally and warmly.]"
                    else:
                        stock_context = f"[SYSTEM NOTE TO AI: You tried to predict {ticker} for {company}, but there wasn't enough historical data. Apologize to the user.]"
                else:
                    stock_context = f"[SYSTEM NOTE TO AI: You couldn't find a valid stock ticker for the company '{company}'.]"

        if chat_session:
            prompt = user_input
            if stock_context:
                prompt += "\n" + stock_context
            elif 'efficiency' in user_lower or 'accuracy' in user_lower:
                 if last_accuracy is not None:
                     prompt += f"\n[SYSTEM NOTE TO AI: The user is asking about your accuracy. Your last prediction was for {last_ticker} with an accuracy of {last_accuracy:.2f}%. Tell them this.]"
                 else:
                     prompt += "\n[SYSTEM NOTE TO AI: The user is asking about your accuracy, but you haven't predicted anything yet. Tell them to ask you to predict a stock first to see your accuracy.]"
            
            try:
                response = chat_session.send_message(prompt)
                print(f"AI: {response.text}")
            except Exception as e:
                print(f"AI (Gemini Error): {e}")
                print("AI: I'm sorry, I'm having trouble connecting to my human-like brain. Let's try again.")
        else:
            # Fallback basic logic
            if any(word in user_lower for word in ['hello', 'hi', 'hey', 'greetings']) and len(user_lower.split()) < 4:
                print("AI: Hello! How can I help you with stock predictions today?")
                continue
                
            if 'how are you' in user_lower:
                print("AI: I'm operating at 100% capacity! Ready to analyze some stocks.")
                continue
                
            if 'who are you' in user_lower or 'what are you' in user_lower:
                print("AI: I am an AI chatbot designed to predict the next closing price of stocks using machine learning (Random Forest Regression).")
                continue
                
            if any(word in user_lower for word in ['efficiency', 'accurate', 'accuracy', 'how good', 'smart']):
                if last_accuracy is not None:
                    print(f"AI: On my last prediction for {last_ticker}, my model achieved an accuracy score of {last_accuracy:.2f}%. Generally, predicting the stock market is difficult and this score represents how well my model fit historical data.")
                else:
                    print("AI: I use a Random Forest Regression model. My accuracy varies depending on the stock's historical volatility. Ask me to predict a stock and I will calculate my confidence/accuracy score for it!")
                continue
                
            if stock_context:
                if "couldn't find a valid stock ticker" in stock_context:
                     print(f"AI: I couldn't find a valid ticker for '{company}'.")
                elif "not enough historical data" in stock_context:
                     print(f"AI: I'm sorry, I couldn't find enough historical data to generate a prediction.")
                else:
                     print(f"AI: Based on my Random Forest model, the predicted next closing price is ${result['prediction']:.2f} with {result['accuracy']:.2f}% accuracy.")
            else:
                print("AI: I am a stock prediction bot. Try asking me to 'predict Apple', 'what is the price of Tesla?', or 'what is your accuracy?'.")

if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore", category=FutureWarning)
    chat()