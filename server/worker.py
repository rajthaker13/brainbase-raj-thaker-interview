import argparse
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def worker(params):
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        workflow = params['workflow']
        driver.get(workflow['startUrl'])
        
        for action in workflow['actions']:
            if action['type'] == 'mousemove':
                ActionChains(driver).move_by_offset(action['x'], action['y']).perform()
            elif action['type'] == 'click':
                element = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, f"//*[@id='{action['elementId']}' or @class='{action['elementClasses']}']"))
                )
                element.click()
            elif action['type'] == 'scroll':
                driver.execute_script(f"window.scrollTo({action['scrollX']}, {action['scrollY']});")
            elif action['type'] == 'input':
                element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, f"//*[@id='{action['elementId']}' or @class='{action['elementClasses']}']"))
                )
                element.send_keys(action['value'])
            elif action['type'] == 'href':
                driver.get(action['href'])
        
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
