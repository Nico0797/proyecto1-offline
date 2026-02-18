import requests
import json

# Test login
login_data = {'email': 'admin@cuaderno.app', 'password': 'admin123'}
response = requests.post('http://127.0.0.1:5000/api/auth/login', json=login_data)
print('Login response:', response.status_code)
if response.status_code == 200:
    data = response.json()
    token = data['access_token']
    print('Token received')
    
    # Get businesses
    headers = {'Authorization': f'Bearer {token}'}
    businesses_response = requests.get('http://127.0.0.1:5000/api/businesses', headers=headers)
    print('Businesses response:', businesses_response.status_code)
    if businesses_response.status_code == 200:
        businesses = businesses_response.json()['businesses']
        print(f'Found {len(businesses)} businesses:')
        for b in businesses:
            print(f'- {b["id"]}: {b["name"]}')
        
        # Test switching businesses by trying to access data from each business
        for business in businesses:
            print(f'\nTesting business: {business["name"]}')
            
            # Try to get products
            products_response = requests.get(
                f'http://127.0.0.1:5000/api/businesses/{business["id"]}/products',
                headers=headers
            )
            print(f'Products: {products_response.status_code}')
            
            # Try to get customers
            customers_response = requests.get(
                f'http://127.0.0.1:5000/api/businesses/{business["id"]}/customers',
                headers=headers
            )
            print(f'Customers: {customers_response.status_code}')
            
            # Try to get sales
            sales_response = requests.get(
                f'http://127.0.0.1:5000/api/businesses/{business["id"]}/sales',
                headers=headers
            )
            print(f'Sales: {sales_response.status_code}')
else:
    print('Login failed')
    print(response.text)
