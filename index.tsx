import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

// --- Reddit OAuth Configuration ---
// IMPORTANT: Replace with your Reddit App's Client ID.
const REDDIT_CLIENT_ID = 'YOUR_REDDIT_CLIENT_ID'; 
// IMPORTANT: This MUST match the Redirect URI you set in your Reddit App settings.
const REDDIT_REDIRECT_URI = window.location.origin + window.location.pathname;
const OAUTH_STATE = 'reddit-gemini-assistant-state'; // A static state for simplicity

// Per coding guidelines, API key must be from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- API Key Status Context ---
type ApiKeyStatus = 'unknown' | 'valid' | 'invalid';
interface ApiKeyStatusContextType {
    status: ApiKeyStatus;
    setStatus: React.Dispatch<React.SetStateAction<ApiKeyStatus>>;
}
const ApiKeyStatusContext = createContext<ApiKeyStatusContextType | null>(null);

// Basic styling for a better UI/UX
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: 'sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    textAlign: 'center',
    margin: 0,
  },
  textarea: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    boxSizing: 'border-box',
    marginBottom: '10px',
    minHeight: '100px',
    resize: 'vertical',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    boxSizing: 'border-box',
    marginBottom: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  button: {
    width: '100%',
    padding: '10px 15px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#4285F4',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
  },
  loginButton: {
      backgroundColor: '#FF4500',
  },
  logoutButton: {
      backgroundColor: '#666',
      padding: '5px 10px',
      fontSize: '12px',
  },
  userInfo: {
      textAlign: 'right',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
  },
  response: {
    marginTop: '20px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  error: {
    color: 'red',
    border: '1px solid red',
    backgroundColor: '#fdd',
  },
  componentBox: {
    border: '1px solid #ddd',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
    backgroundColor: '#fafafa',
  },
  copyButton: {
    padding: '5px 10px',
    fontSize: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontWeight: 'normal',
    width: 'auto',
  },
  apiStatusIndicator: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: '#f0f0f0',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '6px',
  }
};

const ApiKeyStatusIndicator = () => {
    const context = useContext(ApiKeyStatusContext);
    if (!context) return null;
    const { status } = context;

    const getStatusStyle = () => {
        switch (status) {
            case 'valid': return { color: 'green' };
            case 'invalid': return { color: 'red', cursor: 'pointer' };
            default: return { color: 'grey' };
        }
    };

    const handleClick = () => {
        if (status === 'invalid') {
            alert('API Key Error: The provided Gemini API key is invalid or missing. Please ensure the API_KEY environment variable is set correctly and the page is refreshed.');
        }
    };

    return (
        <div style={{...styles.apiStatusIndicator, ...getStatusStyle()}} onClick={handleClick}>
            <span style={{...styles.statusDot, backgroundColor: getStatusStyle().color}}></span>
            API Key: {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
    );
};

const CommentSuggester = () => {
    const [postUrl, setPostUrl] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const context = useContext(ApiKeyStatusContext);

    const handleCopy = useCallback(() => {
        if (suggestion) {
            navigator.clipboard.writeText(suggestion).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Revert back after 2 seconds
            }, (err) => {
                console.error('Failed to copy text: ', err);
            });
        }
    }, [suggestion]);

    const generateComment = useCallback(async () => {
        if (!postUrl.trim() || !postUrl.includes('reddit.com')) {
            setError('Please enter a valid Reddit post URL.');
            return;
        }

        setLoading(true);
        setError('');
        setSuggestion('');
        setIsCopied(false);

        try {
            // 1. Fetch Reddit Post Content
            let jsonUrl = postUrl.split('?')[0];
            if (jsonUrl.endsWith('/')) {
                jsonUrl = jsonUrl.slice(0, -1);
            }
            jsonUrl += '.json';

            const redditResponse = await fetch(jsonUrl);
            if (!redditResponse.ok) {
                throw new Error(`Failed to fetch Reddit post. Status: ${redditResponse.status}`);
            }
            const postData = await redditResponse.json();

            const postTitle = postData[0]?.data?.children[0]?.data?.title ?? 'No title found';
            const postBody = postData[0]?.data?.children[0]?.data?.selftext ?? 'No body text found';

            // 2. Generate Comment with Gemini
            const prompt = `Analyze the following Reddit post and generate a relevant, insightful, and human-like comment that adds to the discussion.

            **Post Title:** ${postTitle}
            
            **Post Body:**
            ${postBody}
            
            Generate a comment now.`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setSuggestion(result.text);
            context?.setStatus('valid');

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            if (errorMessage.toLowerCase().includes('api key not valid')) {
                context?.setStatus('invalid');
                setError('Error: Invalid API Key. Click the status indicator in the header for details.');
            } else {
                setError(`Error: ${errorMessage}`);
            }
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [postUrl, context]);

    return (
        <div style={styles.componentBox}>
            <h2>Comment Suggester</h2>
            <p>Paste the URL of a Reddit post to get an AI-generated comment suggestion.</p>
            <input
                type="text"
                style={styles.input}
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="e.g., https://www.reddit.com/r/..."
            />
            <button
                style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
                onClick={generateComment}
                disabled={loading}
            >
                {loading ? 'Analyzing Post...' : 'Generate Comment Suggestion'}
            </button>

            {error && <div style={{ ...styles.response, ...styles.error }}>{error}</div>}

            {suggestion && (
                <div style={styles.response}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h3>Suggested Comment:</h3>
                        <button onClick={handleCopy} style={styles.copyButton}>
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <p>{suggestion}</p>
                </div>
            )}
        </div>
    );
};

const PostGenerator = () => {
    const [subreddit, setSubreddit] = useState('');
    const [topic, setTopic] = useState('');
    const [post, setPost] = useState<{ title: string; body: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const context = useContext(ApiKeyStatusContext);

    const generatePost = useCallback(async () => {
        if (!subreddit.trim() || !topic.trim()) {
            setError('Please enter a subreddit and a topic.');
            return;
        }

        setLoading(true);
        setError('');
        setPost(null);

        try {
            const prompt = `You are an expert Reddit post creator. Your task is to generate a compelling post title and body for a specific subreddit and topic.

            **Subreddit:** r/${subreddit}
            **Topic:** ${topic}
            
            Please generate a suitable title and a well-structured body for a new post. The tone should be engaging and appropriate for the given subreddit.
            
            The output must be a JSON object with two keys: "title" and "body".`;
            
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            body: { type: Type.STRING },
                        },
                        required: ['title', 'body'],
                    }
                },
            });

            const postObject = JSON.parse(result.text);
            setPost(postObject);
            context?.setStatus('valid');

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            if (errorMessage.toLowerCase().includes('api key not valid')) {
                context?.setStatus('invalid');
                setError('Error: Invalid API Key. Click the status indicator in the header for details.');
            } else {
                setError(`Error: ${errorMessage}`);
            }
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [subreddit, topic, context]);

    return (
        <div style={styles.componentBox}>
            <h2>Post Generator</h2>
            <p>Enter a subreddit and a topic to generate a new post title and body.</p>
            <input
                type="text"
                style={styles.input}
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
                placeholder="e.g., lifehacks, AskScience"
            />
            <input
                type="text"
                style={styles.input}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., A simple trick to peel garlic instantly"
            />
            <button
                style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
                onClick={generatePost}
                disabled={loading}
            >
                {loading ? 'Generating Post...' : 'Generate Post'}
            </button>

            {error && <div style={{ ...styles.response, ...styles.error }}>{error}</div>}

            {post && (
                <div style={styles.response}>
                    <h3>Generated Post:</h3>
                    <h4>Title:</h4>
                    <p>{post.title}</p>
                    <h4>Body:</h4>
                    <p>{post.body}</p>
                </div>
            )}
        </div>
    );
};


const App = () => {
  // State for Reddit Authentication
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('unknown');

  // Handle Reddit OAuth Redirect
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    const state = params.get('state');

    if (token && state === OAUTH_STATE) {
      setAccessToken(token);
      localStorage.setItem('redditAccessToken', token);
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } else {
      // Check for token in localStorage on initial load
      const storedToken = localStorage.getItem('redditAccessToken');
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
  }, []);

  // Fetch username when we have an access token
  useEffect(() => {
    if (accessToken) {
      const fetchUsername = async () => {
        try {
          const response = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `bearer ${accessToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUsername(data.name);
          } else {
             // Token might be expired
             handleLogout();
          }
        } catch (err) {
            console.error('Failed to fetch Reddit username:', err);
            handleLogout();
        }
      };
      fetchUsername();
    }
  }, [accessToken]);


  const handleLogin = () => {
      const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${REDDIT_CLIENT_ID}&response_type=token&state=${OAUTH_STATE}&redirect_uri=${encodeURIComponent(REDDIT_REDIRECT_URI)}&scope=identity`;
      window.location.href = authUrl;
  };

  const handleLogout = () => {
      setAccessToken(null);
      setUsername(null);
      localStorage.removeItem('redditAccessToken');
  };

  return (
    <ApiKeyStatusContext.Provider value={{ status: apiKeyStatus, setStatus: setApiKeyStatus }}>
        <div style={styles.container}>
          <header style={styles.header}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <h1 style={styles.title}>Gemini Reddit Assistant</h1>
                <ApiKeyStatusIndicator />
            </div>
            {username && (
                <div style={styles.userInfo}>
                    Logged in as <strong>{username}</strong>
                    <button onClick={handleLogout} style={{...styles.button, ...styles.logoutButton, marginLeft: '10px'}}>Logout</button>
                </div>
            )}
          </header>

          {!accessToken ? (
            <div>
                <p>Please log in with Reddit to continue.</p>
                 <button onClick={handleLogin} style={{...styles.button, ...styles.loginButton}}>
                    Login with Reddit
                </button>
                {REDDIT_CLIENT_ID === 'YOUR_REDDIT_CLIENT_ID' && (
                    <div style={{...styles.response, ...styles.error, marginTop: '10px'}}>
                        <strong>Action Required:</strong> You must edit `index.tsx` and replace `YOUR_REDDIT_CLIENT_ID` with your actual Reddit App Client ID.
                    </div>
                )}
            </div>
          ) : (
            <>
                <CommentSuggester />
                <PostGenerator />
            </>
          )}
        </div>
    </ApiKeyStatusContext.Provider>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
}