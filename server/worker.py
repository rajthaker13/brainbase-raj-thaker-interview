import argparse
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys

def worker(params):
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=1920,1080")  # Set a default window size
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        workflow = params['workflow']
        
        initial_action = next(action for action in workflow if action['type'] == 'initial_href')
        driver.get(initial_action['href'])
        print(f"Navigated to: {initial_action['href']}")
        
        for action in workflow:
            if action['type'] == 'mousemove':
                # Skip mousemove actions as they're not necessary for most interactions
                continue
            elif action['type'] == 'click':
                try:
                    element = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.XPATH, f"//*[@id='{action.get('elementId', '')}' or contains(@class, '{action.get('elementClasses', '')}')]"))
                    )
                    driver.execute_script("arguments[0].scrollIntoView({behavior: 'auto', block: 'center', inline: 'center'});", element)
                    element.click()
                    print(f"Clicked element: {action.get('elementId') or action.get('elementClasses')}")
                except Exception as e:
                    print(f"Error clicking element: {str(e)}")
            elif action['type'] == 'scroll':
                try:
                    driver.execute_script(f"window.scrollTo({action['scrollX']}, {action['scrollY']});")
                    print(f"Scrolled to: ({action['scrollX']}, {action['scrollY']})")
                except Exception as e:
                    print(f"Error scrolling: {str(e)}")
            elif action['type'] == 'input':
                try:
                    element = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.XPATH, f"//*[@id='{action.get('elementId', '')}' or contains(@class, '{action.get('elementClasses', '')}')]"))
                    )
                    element.clear()
                    element.send_keys(action['value'])
                    print(f"Entered text: {action['value']} into element: {action.get('elementId') or action.get('elementClasses')}")
                except Exception as e:
                    print(f"Error entering text: {str(e)}")
            elif action['type'] == 'href':
                driver.get(action['href'])
                print(f"Navigated to: {action['href']}")
            
            time.sleep(0.5)  # Add a small delay between actions
        
        print("Workflow executed successfully")
    except Exception as e:
        print(f"Error executing workflow: {str(e)}")
    finally:
        driver.quit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--params', type=str, help='Params for worker')
    args = parser.parse_args()
    params = json.loads(args.params)

    worker(params)