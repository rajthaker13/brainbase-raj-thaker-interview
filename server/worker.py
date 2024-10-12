import argparse
import json
import time
import re
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import undetected_chromedriver as uc

def escape_css_class(cls):
    return re.sub(r'([^a-zA-Z0-9_-])', r'\\\1', cls)

def find_element_by_multiple_attributes(driver, element_info):
    locators = []
    
    if element_info.get('id'):
        locators.append((By.ID, element_info['id']))
    
    if element_info.get('classes'):
        class_selector = '.'.join(element_info['classes'])
        locators.append((By.CSS_SELECTOR, f".{class_selector}"))
    
    if element_info.get('tagName'):
        locators.append((By.TAG_NAME, element_info['tagName']))
    
    if element_info.get('textContent'):
        locators.append((By.XPATH, f"//*[contains(text(), '{element_info['textContent']}')]"))
    
    if element_info.get('path'):
        xpath = '//' + '/'.join(element_info['path'].split(' > '))
        locators.append((By.XPATH, xpath))
    
    for by, value in locators:
        try:
            element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((by, value)))
            return element
        except (TimeoutException, NoSuchElementException):
            continue
    
    return None

def adjust_coordinates(driver, x, y):
    viewport_width = driver.execute_script("return window.innerWidth;")
    viewport_height = driver.execute_script("return window.innerHeight;")
    recorded_width = 1920  # Assume this was the width during recording
    recorded_height = 1080  # Assume this was the height during recording
    
    adjusted_x = int(x * (viewport_width / recorded_width))
    adjusted_y = int(y * (viewport_height / recorded_height))
    
    return adjusted_x, adjusted_y

def load_cookies(driver, cookies):
    for cookie in cookies:
        if 'expiry' in cookie:
            del cookie['expiry']
        try:
            driver.add_cookie(cookie)
        except:
            pass  # Silently ignore any cookie-setting errors

def worker(params):
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-browser-side-navigation")
    options.add_argument("--disable-gpu")
    options.add_argument("--lang=en-US,en;q=0.9")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    driver = uc.Chrome(options=options)
    
    try:
        workflow = params.get('workflow', [])
        current_tab_url = None
        
        for action in workflow:
            try:
                action_type = action.get('type')
                
                # Check if we need to switch to a new tab
                if action.get('tabUrl') and action['tabUrl'] != current_tab_url:
                    current_tab_url = action['tabUrl']
                    driver.get(current_tab_url)
                    print(f"Switched to tab: {current_tab_url}")
                    WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(random.uniform(2, 4))  # Random wait to mimic human behavior
                
                if action_type in ['initial_href', 'href']:
                    target_url = action['href']
                    
                    if driver.current_url != target_url:
                        driver.get(target_url)
                        print(f"Navigated to: {target_url}")
                        
                        # Wait for the page to load
                        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                        time.sleep(random.uniform(2, 4))  # Random wait to mimic human behavior
                    
                    # Set cookies without refreshing the page
                    if 'cookies' in action:
                        set_cookies(driver, action['cookies'])
                
                elif action_type == 'click':
                    element = find_and_wait_for_element(driver, action['targetElement'])
                    if element:
                        ActionChains(driver).move_to_element(element).pause(random.uniform(0.1, 0.3)).click().perform()
                        print(f"Clicked element: {action['targetElement'].get('tagName', 'N/A')}")
                        time.sleep(random.uniform(1, 2))  # Random wait after click
                
                elif action_type == 'input':
                    element = find_and_wait_for_element(driver, action['targetElement'])
                    if element:
                        element.clear()
                        for char in action['value']:
                            element.send_keys(char)
                            time.sleep(random.uniform(0.05, 0.15))  # Random delay between keystrokes
                        print(f"Entered text: '{action['value']}' into element")
                        time.sleep(random.uniform(0.5, 1))  # Random wait after input
                
                elif action_type == 'keydown':
                    element = find_and_wait_for_element(driver, action['targetElement'])
                    if element:
                        if 'value' in action and action['value'] is not None:
                            element.clear()
                            for char in action['value']:
                                element.send_keys(char)
                                time.sleep(random.uniform(0.05, 0.15))  # Random delay between keystrokes
                            print(f"Entered text: '{action['value']}' into element")
                        elif 'key' in action:
                            element.send_keys(action['key'])
                            print(f"Pressed key: '{action['key']}' on element")
                        else:
                            print(f"Warning: Keydown action missing both 'value' and 'key': {action}")
                        time.sleep(random.uniform(0.1, 0.3))  # Random wait after keypress
                    else:
                        print(f"Warning: Element not found for keydown action: {action['targetElement']}")
                
                elif action_type == 'mousemove':
                    # Implement realistic mouse movement
                    x, y = action['x'], action['y']
                    ActionChains(driver).move_by_offset(x, y).perform()
                    time.sleep(random.uniform(0.1, 0.3))  # Random wait after mouse move
                
                else:
                    print(f"Unknown action type: {action_type}")
                
                # Check for CAPTCHA or bot detection
                if "captcha" in driver.page_source.lower() or "bot detection" in driver.page_source.lower():
                    print("CAPTCHA or bot detection encountered. Waiting for manual intervention...")
                    # Wait for manual intervention (you may want to implement a more sophisticated solution here)
                    time.sleep(30)
                
            except Exception as e:
                print(f"Error processing action: {action}")
                print(f"Error details: {str(e)}")
                # Continue with the next action instead of stopping the entire workflow
                continue
        
        print("Workflow executed successfully")
    except Exception as e:
        print(f"Error executing workflow: {str(e)}")
    finally:
        driver.quit()

def set_cookies(driver, cookies):
    for cookie in cookies:
        try:
            cookie_copy = {k: v for k, v in cookie.items() if k in ['name', 'value', 'domain', 'path']}
            if cookie_copy['domain'].startswith('.'):
                cookie_copy['domain'] = cookie_copy['domain'][1:]
            if cookie_copy['domain'] in driver.current_url:
                driver.add_cookie(cookie_copy)
        except:
            pass  # Silently ignore any cookie-setting errors

def find_and_wait_for_element(driver, element_info):
    locators = get_locators(element_info)
    for by, value in locators:
        try:
            element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((by, value)))
            return element
        except:
            continue
    print(f"Element not found: {element_info}")
    return None

def get_locators(element_info):
    locators = []
    if element_info.get('id'):
        locators.append((By.ID, element_info['id']))
    if element_info.get('classes'):
        locators.append((By.CSS_SELECTOR, '.' + '.'.join(element_info['classes'])))
    if element_info.get('tagName'):
        locators.append((By.TAG_NAME, element_info['tagName']))
    if element_info.get('textContent'):
        locators.append((By.XPATH, f"//*[contains(text(), '{element_info['textContent']}')]"))
    if element_info.get('path'):
        locators.append((By.XPATH, '//' + '/'.join(element_info['path'].split(' > '))))
    return locators

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--params', type=str, help='Params for worker')
    args = parser.parse_args()
    params = json.loads(args.params)

    worker(params)